import { MDXRemote } from 'next-mdx-remote/rsc'
import type { ComponentPropsWithoutRef } from 'react'

interface MdxContentProps {
  body: string
}

// Element overrides keep the rendered MDX visually on-brand: external links open
// safely, the `.studio-mdx` wrapper's CSS already styles headings/code/lists/etc.
// Authors can also register custom React components here and use them in .mdx.
const components = {
  a: (props: ComponentPropsWithoutRef<'a'>) => {
    const external = props.href?.startsWith('http')
    return external
      ? <a {...props} target="_blank" rel="noopener noreferrer" />
      : <a {...props} />
  },
}

/**
 * Real MDX rendering (next-mdx-remote/rsc). Compiles the post body to React on
 * the server at build time — the MDX compiler never reaches the client bundle,
 * so the studio stays runtime-light. Replaces the previous hand-rolled
 * markdown-subset renderer; posts can now embed components and use full markdown.
 */
export default function MdxContent({ body }: MdxContentProps) {
  return (
    <div className="studio-mdx">
      <MDXRemote source={body} components={components} />
    </div>
  )
}
