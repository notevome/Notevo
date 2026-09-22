import React, { useState } from "react";
import { JSONContent } from "@tiptap/react";
import TailwindAdvancedEditor from "@/components/advanced-editor";

interface Tab {
  id: number;
  title: string;
  url: string;
  content: JSONContent;
}

const BrowserMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(1);
  const [content, setContent] = useState<JSONContent>({
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: {
          level: 1,
        },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "textStyle",
                attrs: {
                  color: "var(--novel-text-orange)",
                },
              },
            ],
            text: "Fine Tuning Large Language Model (LLM) :",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            marks: [
              {
                type: "highlight",
                attrs: {
                  color: "var(--novel-highlight-default)",
                },
              },
            ],
            text: "Fine-tuning refers to the process of taking a pre-trained model and adapting it to a specific task by training it further on a smaller, domain-specific dataset. It refines the model’s capabilities and improving its accuracy in specialized tasks without needing a massive dataset or expensive computational resources.",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Fine-tuning allows us to:",
          },
        ],
      },
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Steer the model",
                  },
                  {
                    type: "text",
                    text: " towards performing optimally on particular tasks.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Ensure model outputs",
                  },
                  {
                    type: "text",
                    text: " align with expected results for real-world applications.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Reduce model hallucinations",
                  },
                  {
                    type: "text",
                    text: " and improve output relevance and honesty.",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        type: "image",
        attrs: {
          src: "https://media.geeksforgeeks.org/wp-content/uploads/20241209185908679747/Fine-Tuning-Large-Language-Models.webp",
          alt: "Fine-Tuning-Large-Language-Models",
          title: null,
          width: 801,
          height: 400,
        },
      },
      {
        type: "heading",
        attrs: {
          level: 2,
        },
        content: [
          {
            type: "text",
            marks: [
              {
                type: "highlight",
                attrs: {
                  color: "var(--novel-highlight-blue)",
                },
              },
            ],
            text: "How is Fine-Tuning Performed?",
          },
        ],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "The general fine-tuning process can be broken down into following steps:",
          },
        ],
      },
      {
        type: "orderedList",
        attrs: {
          start: 1,
          type: null,
        },
        content: [
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Select Base Model: ",
                  },
                  {
                    type: "text",
                    text: "Choose a pre-trained model based on our task and compute budget.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Choose Fine-Tuning Method:",
                  },
                  {
                    type: "text",
                    text: " Select the most appropriate method like ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/artificial-intelligence/instruction-tuning-for-large-language-models/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                      {
                        type: "bold",
                      },
                    ],
                    text: "I",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/artificial-intelligence/instruction-tuning-for-large-language-models/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "nstruction Fine-Tuning",
                  },
                  {
                    type: "text",
                    text: ", ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/artificial-intelligence/supervised-fine-tuning-sft-for-llms/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "Supervised Fine-Tuning",
                  },
                  {
                    type: "text",
                    text: ", ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/artificial-intelligence/what-is-parameter-efficient-fine-tuning-peft/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "PEFT",
                  },
                  {
                    type: "text",
                    text: ", ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/deep-learning/what-is-low-rank-adaptation-lora/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "lora",
                  },
                  {
                    type: "text",
                    text: ", ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/deep-learning/what-is-qlora-quantized-low-rank-adapter/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "qlora",
                  },
                  {
                    type: "text",
                    text: ", etc based on the task and dataset.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Prepare Dataset:",
                  },
                  {
                    type: "text",
                    text: " Structure our data for task-specific training, ensuring the format matches the model's requirements.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Training: ",
                  },
                  {
                    type: "text",
                    text: "Use frameworks like TensorFlow, PyTorch or high-level libraries like ",
                  },
                  {
                    type: "text",
                    marks: [
                      {
                        type: "link",
                        attrs: {
                          href: "https://www.geeksforgeeks.org/machine-learning/getting-started-with-transformers/",
                          target: "_blank",
                          rel: "noopener",
                          class:
                            "text-blue-200 underline underline-offset-[3px] hover:text-blue-800 transition-colors cursor-pointer text-blue-700",
                        },
                      },
                    ],
                    text: "Transformers",
                  },
                  {
                    type: "text",
                    text: " to fine-tune the model.",
                  },
                ],
              },
            ],
          },
          {
            type: "listItem",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    marks: [
                      {
                        type: "bold",
                      },
                    ],
                    text: "Evaluate and Iterate:",
                  },
                  {
                    type: "text",
                    text: " Test the model, refine it as necessary and re-train to improve performance.",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });

  const tabs: Tab[] = [
    {
      id: 1,
      title: "Try out our rich text editor !",
      url: "https://notevo.me/",
      content: content,
    },
  ];

  const currentTab = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  return (
    <div className="w-full">
      {/* Responsive Browser Container */}
      <div
        className="
          relative
          Desktop:w-full 
          Desktop:h-[43rem] 
          h-[35rem]
          overflow-hidden
          app-radius-lg
          border border-border
        "
      >
        {/* Browser Frame - Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10">
          {/* Toolbar with Tabs */}
          <div className="bg-secondary h-11 flex items-stretch">
            {/* Mac Dots */}
            <div className="pl-3 pr-2 pt-3 flex-none flex items-center gap-2">
              <span className="w-3 h-3 app-radius-full bg-background/80"></span>
              <span className="w-3 h-3 app-radius-full bg-background/80"></span>
              <span className="w-3 h-3 app-radius-full bg-background/80"></span>
            </div>

            {/* Tabs */}
            <div className="flex items-end space-x-1 overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <div
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-4 py-2 text-xs sm:text-sm cursor-pointer app-radius-md transition
                    border-x border-t border-border
                    ${
                      activeTab === tab.id
                        ? "bg-background/80 text-foreground"
                        : "bg-muted text-muted-foreground hover:bg-bg-background/80"
                    }
                  `}
                >
                  {tab.title}
                </div>
              ))}
            </div>
          </div>

          {/* Address Bar */}
          <div className="bg-secondary border-b border-border px-3 py-2 flex items-center gap-3">
            {/* Navigation Arrows */}
            <div className="flex gap-2 text-background/80">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M7.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* URL Bar */}
            <div className="flex-1 bg-background/80 backdrop-blur app-radius-lg px-4 py-1.5 text-xs sm:text-sm text-muted-foreground border border-border">
              {currentTab.url}
            </div>

            {/* Right Icons */}
            <div className="flex gap-3 text-muted-foreground">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5.5 0 0010 11z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Page Content Area */}
        <div className="h-full pt-24 pb-6 px-4 sm:px-6 lg:px-8 bg-background app-radius-lg overflow-y-auto">
          <TailwindAdvancedEditor
            editorBubblePlacement={false}
            initialContent={currentTab.content}
            onUpdate={(editor) => {
              const updatedContent = editor.getJSON();
              setContent(updatedContent);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrowserMockup;
