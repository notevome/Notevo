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
      <MaxWContainer>
        <SectionHeading
          SectionTitle="Frequently Asked Questions"
          SectionSubTitle="if your interested"
        />

        <Accordion
          type="single"
          collapsible
          defaultValue="shipping"
          className="max-w-2xl mx-auto min-h-[400px]"
        >
          {AccordionData.map((item, index) => (
            <AccordionItem key={index} value={item.itmevalue}>
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
