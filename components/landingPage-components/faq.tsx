import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MaxWContainer from "@/components/ui/MaxWContainer";
import SectionHeading from "./SectionHeading";
import { AccordionData } from "@/lib/data";
export default function FAQ() {
  return (
    <section
      id="faq"
      className="relative pt-12 sm:pt-16 md:pt-20 Desktop:pt-24 "
    >
      <MaxWContainer className="md:flex justify-between items-start !max-w-[1300px] ">
        <div className="md:sticky top-24 md:max-w-lg">
          <SectionHeading
            SectionTitle="Frequently Asked Questions"
            SectionSubTitle="if your interested in learning more about Notevo. "
          />
        </div>

        <Accordion
          type="single"
          collapsible
          defaultValue="shipping"
          className="max-w-2xl mx-auto md:mx-0 min-h-[500px] flex-1"
        >
          {AccordionData.map((item, index) => (
            <AccordionItem key={index} value={item.itmevalue} className="mb-4">
              <AccordionTrigger className="animated-highlight-container text-2xl font-medium">
                {" "}
                <span className="animated-highlight">{item.trigger}</span>{" "}
              </AccordionTrigger>
              <AccordionContent className=" px-2 text-lg">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </MaxWContainer>
    </section>
  );
}
