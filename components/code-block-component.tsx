"use client";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { useState } from "react";
import { Check, Copy, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const CodeBlockComponent = ({
  node,
  updateAttributes,
  extension,
}: any) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const languages = [
    { value: "plaintext", label: "Plain Text" },
    { value: "javascript", label: "JavaScript" },
    { value: "typescript", label: "TypeScript" },
    { value: "python", label: "Python" },
    { value: "java", label: "Java" },
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "php", label: "PHP" },
    { value: "ruby", label: "Ruby" },
    { value: "go", label: "Go" },
    { value: "rust", label: "Rust" },
    { value: "swift", label: "Swift" },
    { value: "kotlin", label: "Kotlin" },
    { value: "html", label: "HTML" },
    { value: "css", label: "CSS" },
    { value: "sql", label: "SQL" },
    { value: "bash", label: "Bash" },
    { value: "json", label: "JSON" },
    { value: "yaml", label: "YAML" },
    { value: "markdown", label: "Markdown" },
  ];

  const currentLanguage = languages.find(
    (lang) => lang.value === (node.attrs.language || "plaintext"),
  );

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="code-block-header">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 px-2 py-2 gap-2"
              contentEditable={false}
              type="button"
            >
              {currentLanguage?.label}
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="max-h-64 min-w-32 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
            align="start"
          >
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.value}
                onClick={() => updateAttributes({ language: lang.value })}
                className="text-xs"
                style={{
                  color:
                    lang.value === node.attrs.language
                      ? "hsl(var(--primary))"
                      : undefined,
                  fontWeight:
                    lang.value === node.attrs.language ? "600" : "400",
                }}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          className="h-8 px-2 py-2 gap-2"
          contentEditable={false}
          onClick={copyToClipboard}
          type="button"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              <span className="font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy</span>
            </>
          )}
        </Button>
      </div>
      <pre className="code-block-content">
        <NodeViewContent as="code" />
      </pre>
    </NodeViewWrapper>
  );
};
