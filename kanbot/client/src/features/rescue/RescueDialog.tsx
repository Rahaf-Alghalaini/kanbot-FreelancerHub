import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CalendarCheck, Scissors } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { todosApi } from '../../api/todos';
import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Modal } from '../../components/Modal';
import { useToast } from '../../components/Toast';
import { useSprintsQuery, useRefreshSprints } from '../../hooks/useSprints';
import { useRefreshTodos } from '../../hooks/useTodos';
import { rich, t, tp, tpb } from '../../i18n';
import { formatDay } from '../../lib/format';
import { readJson, writeJson } from '../../lib/storage';
import { analyzeSprint, DEFAULT_HOURS_PER_DAY, ruleBasedPlan, type PlanItem, type ReasonCode, type RescueAnalysis, type RescuePlan } from '../../lib/rescue';
import type { Sprint, Todo } from '../../types/api';
import { PriorityBadge } from '../todos/PriorityBadge';
import { TypeIcon } from '../todos/TypeIcon';
import { mergeAiPlan, parseAiRescue, rescueMessages, rescuePrompt } from './rescueAi';

type Props = { sprint: Sprint | null; projectId: string; todos: Todo[]; onClose: () => void };

const HOURS_KEY = 'kanbot.rescue.hoursPerDay';

/** Sprint Rescue Mode: how much time do you have → what is wrong → what to keep, what to defer, day by day. */
export function RescueDialog({ sprint, projectId, todos, onClose }: Props) {
  return (
    <Modal open={!!sprint} title={t('rescue.title')} wide onClose={onClose}>
      {sprint && <Body sprint={sprint} projectId={projectId} todos={todos} onClose={onClose} />}
    </Modal>
  );
}

function Body({ sprint, projectId, todos, onClose }: Omit<Props, 'sprint'> & { sprint: Sprint }) {
  const toast = useToast();
  const refreshTodos = useRefreshTodos();
  const refreshSprints = useRefreshSprints();
  const planned = (useSprintsQuery(projectId).data?.sprints ?? []).filter((s) => s.status === 'planned');

  const [hours, setHours] = useState(String(readJson<number>(HOURS_KEY, DEFAULT_HOURS_PER_DAY)));
  const [hoursError, setHoursError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<RescueAnalysis | null>(null);
  const [plan, setPlan] = useState<RescuePlan | null>(null);
  const [aiFailed, setAiFailed] = useState(false);
  const [target, setTarget] = useState<'backlog' | string>('backlog');

  const analyze = useMutation({
    mutationFn: async (hoursPerDay: number) => {
      const a = analyzeSprint(sprint, todos, { hoursPerDay });
      if (!a) throw new Error(t('rescue.noDates'));
      // The rules give a complete plan right away; the AI refines it when it can.
      let result = ruleBasedPlan(a);
      let failed = false;
      if (a.tasks.length > 0 && !a.overdue) {
        try {
          const res = await aiApi.chat(projectId, { messages: rescueMessages(rescuePrompt(a, sprint.name).text) });
          const ai = res.source === 'ai' ? parseAiRescue(res.message.content) : null;
          if (ai) result = mergeAiPlan(a, ai);
          else failed = true;
        } catch {
          failed = true;
        }
      }
      return { a, result, failed };
    },
    onSuccess: ({ a, result, failed }) => {
      setAnalysis(a);
      setPlan(result);
      setAiFailed(failed);
    },
  });

  const run = () => {
    const n = Number(hours);
    if (!Number.isFinite(n) || n < 0.5 || n > 16) return setHoursError(t('rescue.hoursErr'));
    setHoursError(null);
    writeJson(HOURS_KEY, n);
    analyze.mutate(n);
  };

  const apply = useMutation({
    mutationFn: async () => {
      const dest = target === 'backlog' ? null : target;
      const results = await Promise.allSettled((plan?.defer ?? []).map((i) => todosApi.update(i.task.todo.id, { sprintId: dest })));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) throw new Error(t('rescue.applyPartial', { failed, total: results.length }));
      return results.length;
    },
    onSuccess: async (n) => {
      await Promise.all([refreshTodos(), refreshSprints()]);
      toast(tp('rescue.applied', n), 'success');
      onClose();
    },
    onError: () => refreshTodos(),
  });

  if (!plan || !analysis) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); run(); }} noValidate>
        <p className="rescue-intro">{t('rescue.intro')}</p>
        {analyze.error && <ErrorBanner error={analyze.error} onRetry={run} />}
        <label className="field" style={{ maxWidth: 260 }}>
          <span className="field-label">{t('rescue.hours')}</span>
          <input type="number" min={0.5} max={16} step={0.5} value={hours} onChange={(e) => setHours(e.target.value)} />
          {hoursError ? <span className="error" role="alert">{hoursError}</span> : <span className="due">{t('rescue.hoursHint')}</span>}
        </label>
        <div className="form-actions">
          <Button type="button" variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button type="submit" loading={analyze.isPending}>{analyze.isPending ? t('rescue.analyzing') : t('rescue.analyze')}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="rescue">
      <Diagnosis a={analysis} />

      {analysis.overdue && <div className="banner" role="alert">{t('rescue.overdue')}</div>}
      {analysis.tasks.length === 0 && <p className="drop-empty">{t('rescue.nothingLeft')}</p>}
      {aiFailed && <p className="rescue-note">{t('rescue.aiFailed')}</p>}

      {plan.summary && <p className="rescue-summary">{plan.summary}</p>}
      {plan.overCapacity && (
        <p className="rescue-warn"><AlertTriangle size={14} /> {t('rescue.overCapacity', { effort: plan.keepEffort, cap: analysis.capacity })}</p>
      )}

      {plan.keep.length > 0 && (
        <section className="rescue-section">
          <h3>{t('rescue.keep')} <span>{rich(t('rescue.effortOf', { effort: `<b>${plan.keepEffort}</b>`, cap: analysis.capacity }))}</span></h3>
          <ul className="plan-list">{plan.keep.map((i) => <Row key={i.task.todo.id} item={i} />)}</ul>
        </section>
      )}

      {plan.schedule.length > 0 && (
        <section className="rescue-section">
          <h3><CalendarCheck size={15} /> {t('rescue.schedule')}</h3>
          <ol className="rescue-days">
            {plan.schedule.map((d) => (
              <li key={d.day}>
                <strong>{formatDay(d.day)}</strong>
                <span>{d.items.map((x) => (x.continued ? t('rescue.continues', { key: x.item.task.todo.key }) : x.item.task.todo.key)).join(' · ')}</span>
                <small>{tp('n.point', d.effort)}</small>
              </li>
            ))}
          </ol>
        </section>
      )}

      {plan.split.length > 0 && (
        <section className="rescue-section">
          <h3><Scissors size={15} /> {t('rescue.split')}</h3>
          <ul className="rescue-bullets">{plan.split.map((s) => <li key={s.key}><b>{s.key}</b> {s.suggestion}</li>)}</ul>
        </section>
      )}

      {plan.defer.length > 0 && (
        <section className="rescue-section">
          <h3>{t('rescue.defer')} <span>{rich(tpb('n.task', plan.defer.length))}</span></h3>
          <ul className="plan-list">{plan.defer.map((i) => <Row key={i.task.todo.id} item={i} />)}</ul>
          <label className="field rescue-target">
            <span className="field-label">{t('rescue.moveTo')}</span>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option value="backlog">{t('nav.backlog')}</option>
              {planned.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </section>
      )}

      {plan.risks.length > 0 && (
        <section className="rescue-section">
          <h3><AlertTriangle size={15} /> {t('rescue.risks')}</h3>
          <ul className="rescue-bullets">{plan.risks.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
      )}

      {apply.error && <ErrorBanner error={apply.error} onRetry={() => apply.mutate()} />}
      <div className="form-actions split">
        <Button variant="ghost" onClick={() => { setPlan(null); setAnalysis(null); analyze.reset(); apply.reset(); }}>{t('common.back')}</Button>
        <span className="spacer" />
        <Button variant="ghost" onClick={onClose}>{t('rescue.keepAsIs')}</Button>
        <Button loading={apply.isPending} disabled={plan.defer.length === 0} onClick={() => apply.mutate()}>
          {t('rescue.apply')} <ArrowRight size={14} className="flip-rtl" />
        </Button>
      </div>
    </div>
  );
}

function Diagnosis({ a }: { a: RescueAnalysis }) {
  const stats = [
    { label: t('rescue.statLeft'), value: a.overdue ? '0' : String(a.workDays), sub: t('rescue.statDays') },
    { label: t('rescue.statDone'), value: `${a.doneTasks}/${a.totalTasks}`, sub: t('rescue.statTasks') },
    { label: t('rescue.statEffort'), value: String(a.remainingEffort), sub: t('rescue.statPoints') },
    { label: t('rescue.statCapacity'), value: String(a.capacity), sub: t('rescue.statHours', { h: a.hoursPerDay }) },
  ];
  return (
    <section className={`rescue-diagnosis risk-${a.risk}`} aria-label={t('rescue.diagnosis')}>
      <p className="rescue-risk"><AlertTriangle size={16} /> {t(`rescue.risk.${a.risk}`)}</p>
      <div className="tiles">
        {stats.map((s) => <div key={s.label} className="tile"><small>{s.label}</small><strong>{s.value}</strong><span>{s.sub}</span></div>)}
      </div>
      <ul className="rescue-bullets">
        {a.lateCount > 0 && <li>{tp('rescue.lateTasks', a.lateCount)}</li>}
        {a.unestimated > 0 && <li>{tp('rescue.unestimated', a.unestimated)}</li>}
        {a.observedPace > 0 && <li>{t('rescue.pace', { pace: a.observedPace, cap: a.paceCapacity })}</li>}
        {a.tasks.some((x) => x.blockedBy.length > 0) && <li>{tp('rescue.blockedTasks', a.tasks.filter((x) => x.blockedBy.length > 0).length)}</li>}
      </ul>
    </section>
  );
}

const CODE_TEXT: Record<Exclude<ReasonCode, 'unblocks'>, Parameters<typeof t>[0]> = {
  urgent: 'rescue.why.urgent',
  late: 'rescue.why.late',
  inFlight: 'rescue.why.inFlight',
  value: 'rescue.why.value',
  blocked: 'rescue.why.blocked',
  capacity: 'rescue.why.capacity',
};

function Row({ item }: { item: PlanItem }) {
  const { todo, effort, blockedBy } = item.task;
  const why = item.note ?? (item.code === 'unblocks' ? t('rescue.why.unblocks', { key: item.via ?? '' }) : t(CODE_TEXT[item.code]));
  const waits = blockedBy.join(', ');
  return (
    <li className="plan-item static rescue-row">
      <div className="rescue-row-main">
        <TypeIcon type={todo.type} />
        <span className="todo-key">{todo.key}</span>
        <span className="todo-title">{todo.title}</span>
        <PriorityBadge priority={todo.priority} />
        <span className="points" title={t('rescue.effortLeft')}>{effort}</span>
      </div>
      <small className="rescue-why">{why}{waits && ` · ${t('rescue.waitsFor', { keys: waits })}`}</small>
    </li>
  );
}
