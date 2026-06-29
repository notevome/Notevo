import MaxWContainer from "../ui/MaxWContainer";
import { NOISE_PNG } from "@/lib/data";
import { cn } from "@/lib/utils";
export default function MoreAboutMe() {
  return (
    <section id="about" className="py-12 sm:py-16 md:py-20 Desktop:py-24">
      <MaxWContainer>
        <div className="relative pt-10">
          <div className="absolute inset-x-0 bottom-0 top-4 rounded-sm bg-primary" />
          <div className="absolute inset-x-0 bottom-0 top-2 rounded-sm bg-primary/90" />

          {/* Main paper */}
          <div
            className="relative overflow-hidden"
            style={{
              background: "#efefef",
              backgroundImage: `repeating-linear-gradient(
                to bottom,
                transparent,
                transparent 36px,
                #644a40 37px
              )`,
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none select-none absolute  inset-0 "
              style={{
                backgroundImage: `url(${NOISE_PNG})`,
                backgroundRepeat: "repeat",
                backgroundSize: "128px 128px",
                opacity: 0.05,
                mixBlendMode: "multiply",
                zIndex: 5,
              }}
            />
            <div className="absolute top-0 bottom-0 left-10 md:left-16 w-px bg-[#f5a0a07d]" />

            <div
              className="w-full border border-border flex flex-col sm:flex-row items-center gap-6 sm:gap-10 px-6 sm:px-10"
              style={{ paddingTop: "9px", paddingBottom: "9px" }}
            >
              <div className="flex flex-col justify-between py-6 pl-6 md:pl-12 gap-3 w-full sm:w-2/3">
                <div className="space-y-0">
                  <p
                    className="text-lg sm:text-xl leading-relaxed text-foreground"
                    style={{
                      fontFamily: "Georgia, serif",
                      lineHeight: "37px",
                    }}
                  >
                    I've been looking for a Note Taking app that's simpler than
                    Notion but more organized than Google Keep.
                  </p>
                  <p
                    className="text-base sm:text-lg leading-relaxed text-muted-foreground"
                    style={{
                      fontFamily: "Georgia, serif",
                      fontStyle: "italic",
                      lineHeight: "37px",
                    }}
                  >
                    Something clean, structured, with a rich text editor. That's
                    what Notevo's trying to be: a minimal, structured, Note
                    Taking app.
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-muted w-fit">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Mohammed H
                    </p>
                    <p
                      className="text-xs text-muted-foreground"
                      style={{ fontStyle: "italic" }}
                    >
                      Building Notevo
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MaxWContainer>
    </section>
  );
}
