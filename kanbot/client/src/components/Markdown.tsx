import ReactMarkdown from 'react-markdown';

/** Renders AI replies. Raw HTML is skipped, links open in a new tab. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown
        skipHtml
        components={{
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
