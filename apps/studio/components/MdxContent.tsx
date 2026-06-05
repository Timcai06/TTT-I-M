import type { ReactNode } from 'react'

interface MdxContentProps {
  body: string
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  const pattern = /(`[^`]+`|\[[^\]]+\]\([^)]+\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    if (token.startsWith('`')) {
      nodes.push(<code key={`${match.index}-code`}>{token.slice(1, -1)}</code>)
    } else {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token)
      if (linkMatch) {
        nodes.push(
          <a href={linkMatch[2]} key={`${match.index}-link`}>
            {linkMatch[1]}
          </a>,
        )
      }
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex))
  }

  return nodes
}

export default function MdxContent({ body }: MdxContentProps) {
  const blocks = body.split(/\n{2,}/)

  return (
    <div className="studio-mdx">
      {blocks.map((block, index) => {
        const trimmed = block.trim()
        if (!trimmed) return null

        if (trimmed.startsWith('```')) {
          const code = trimmed.replace(/^```\w*\n?/, '').replace(/\n?```$/, '')
          return (
            <pre key={index}>
              <code>{code}</code>
            </pre>
          )
        }

        if (trimmed.startsWith('### ')) {
          return <h3 key={index}>{renderInline(trimmed.slice(4))}</h3>
        }

        if (trimmed.startsWith('## ')) {
          return <h2 key={index}>{renderInline(trimmed.slice(3))}</h2>
        }

        if (trimmed.startsWith('# ')) {
          return <h1 key={index}>{renderInline(trimmed.slice(2))}</h1>
        }

        if (trimmed.startsWith('- ')) {
          return (
            <ul key={index}>
              {trimmed.split('\n').map((item) => (
                <li key={item}>{renderInline(item.replace(/^- /, ''))}</li>
              ))}
            </ul>
          )
        }

        return <p key={index}>{renderInline(trimmed)}</p>
      })}
    </div>
  )
}
