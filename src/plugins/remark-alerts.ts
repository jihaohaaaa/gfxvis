interface MdastNode {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

type AlertType = "note" | "tip" | "important" | "warning" | "caution";

interface AlertConfig {
  type: AlertType;
  title: string;
  svgPath: string;
}

const ALERT_CONFIGS: Record<AlertType, AlertConfig> = {
  note: {
    type: "note",
    title: "Note",
    svgPath:
      '<path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>',
  },
  tip: {
    type: "tip",
    title: "Tip",
    svgPath:
      '<path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.099-.118-.204-.239-.313-.36C3.125 7.72 2.5 6.786 2.5 5.25 2.5 2.378 4.79 0 8 0c3.21 0 5.5 2.378 5.5 5.25 0 1.535-.625 2.47-1.278 3.238l-.313.36c-.18.21-.36.425-.542.68-.207.3-.33.565-.37.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5Zm1 3h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5Z"></path>',
  },
  important: {
    type: "important",
    title: "Important",
    svgPath:
      '<path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>',
  },
  warning: {
    type: "warning",
    title: "Warning",
    svgPath:
      '<path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path>',
  },
  caution: {
    type: "caution",
    title: "Caution",
    svgPath:
      '<path d="M4.47.22A.749.749 0 0 1 5 0h6c.199 0 .389.079.53.22l4.25 4.25c.141.14.22.331.22.53v6a.749.749 0 0 1-.22.53l-4.25 4.25A.749.749 0 0 1 11 16H5a.749.749 0 0 1-.53-.22L.22 11.53A.749.749 0 0 1 0 11V5c0-.199.079-.389.22-.53Zm.84 1.28L1.5 5.31v5.38l3.81 3.81h5.38l3.81-3.81V5.31L10.69 1.5ZM8 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 8 4Zm0 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path>',
  },
};

const ALERT_REGEX = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\r?\n|$)/i;

function walkBlockquotes(
  tree: unknown,
  visit: (node: MdastNode) => void,
): void {
  if (!tree || typeof tree !== "object") return;
  const node = tree as MdastNode;
  if (node.type === "blockquote") {
    visit(node);
  }
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      walkBlockquotes(child, visit);
    }
  }
}

/**
 * Remark plugin to transform GitHub-style Alert blockquotes into styled HTML alert containers.
 */
export default function remarkAlerts() {
  return (tree: unknown) => {
    walkBlockquotes(tree, (blockquoteNode) => {
      if (!blockquoteNode.children || blockquoteNode.children.length === 0)
        return;

      const firstChild = blockquoteNode.children[0];
      if (
        !firstChild ||
        firstChild.type !== "paragraph" ||
        !firstChild.children
      )
        return;

      const firstInline = firstChild.children[0];
      if (
        !firstInline ||
        firstInline.type !== "text" ||
        typeof firstInline.value !== "string"
      ) {
        return;
      }

      const match = firstInline.value.match(ALERT_REGEX);
      if (!match) return;

      const matchedType = match[1].toLowerCase() as AlertType;
      const config = ALERT_CONFIGS[matchedType];
      if (!config) return;

      // 1. Remove the [!TYPE] marker and subsequent newline from the first text node
      firstInline.value = firstInline.value.slice(match[0].length);

      // 2. Clean up empty nodes if any
      if (firstInline.value.length === 0) {
        firstChild.children.shift();
      }
      if (firstChild.children.length === 0) {
        blockquoteNode.children.shift();
      }

      // 3. Set blockquote to render as div with alert classes
      blockquoteNode.data = blockquoteNode.data || {};
      blockquoteNode.data.hName = "div";
      blockquoteNode.data.hProperties = {
        className: ["markdown-alert", `markdown-alert-${config.type}`],
      };

      // 4. Inject styled title element with SVG icon
      const titleNode: MdastNode = {
        type: "html",
        value: `<p class="markdown-alert-title"><svg class="markdown-alert-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">${config.svgPath}</svg><span>${config.title}</span></p>`,
      };

      blockquoteNode.children.unshift(titleNode);
    });
  };
}
