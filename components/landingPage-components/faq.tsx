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
      className="relative px-4 sm:px-6 md:px-8 pt-12 sm:pt-16 md:pt-20 Desktop:pt-24 "
    >
      <MaxWContainer>
        <SectionHeading
          SectionTitle="FAQ"
          SectionSubTitle="if your interested"
        />

        <Accordion
          type="single"
          collapsible
          defaultValue="shipping"
          className="max-w-lg mx-auto min-h-[238px]"
        >
          {AccordionData.map((item, index) => (
            <AccordionItem key={index} value={item.itmevalue}>
              <AccordionTrigger>{item.trigger}</AccordionTrigger>
              <AccordionContent>{item.content}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </MaxWContainer>
    </section>
  );
}
