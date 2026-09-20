"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import MaxWContainer from "@/components/ui/MaxWContainer";
import { useMediaQuery } from "react-responsive";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <h3 className="text-sm font-medium text-foreground mb-1.5 tracking-wide">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-foreground/70">{children}</p>
    </div>
  );
}

function SectionBlock({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="mb-11 scroll-mt-6 opacity-0 translate-y-3 animate-[fadeUp_0.5s_ease_forwards]"
    >
      <div className="flex items-baseline gap-3 mb-5 pb-2.5 border-b border-border">
        <h2 className=" text-xl font-semibold text-primary tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function TermsPage() {
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 640 });
  useEffect(() => {
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const router = useRouter();

  return (
    <div className=" relative force-light fadeUp bg-background  text-foreground flex flex-col min-h-screen">
      <div className="flex-grow">
        <MaxWContainer className="max-w-[760px] mx-auto px-6 pb-44">
          {/* Hero */}
          <div className="pt-16 pb-10 opacity-0 translate-y-3 animate-[fadeUp_0.4s_0.05s_ease_forwards]">
            <div className="text-[0.68rem]  tracking-widest uppercase mb-0.5 opacity-60">
              <p className="leading-tight text-[0.78rem] font-semibold text-primary">
                last modified: March 6, 2025
              </p>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary leading-tight tracking-tight mb-3">
              Notevo Terms of Service
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
              These terms govern your use of Notevo. By using our platform, you
              agree to the following conditions , please take a moment to read
              through them carefully.
            </p>
          </div>

          {/* Sections */}
          <SectionBlock id="liability" number="01" title="Liability">
            <SubSection title="No Warranty or Guarantee">
              We provide this service &quot;as-is&quot; and without any warranty
              or guarantee. While we make every effort to ensure the
              functionality, security, and reliability of our platform, we do
              not make any representations or warranties regarding the accuracy,
              completeness, or suitability of the information and materials
              found or offered on this platform.
            </SubSection>
            <SubSection title="Exclusion of Liability">
              In no event shall Notevo be liable for any direct, indirect,
              incidental, consequential, special, or exemplary damages including
              but not limited to damages for loss of profits, goodwill, use,
              data, or other intangible losses resulting from the use or
              inability to use our services.
            </SubSection>
            <SubSection title="User Responsibility">
              You acknowledge and agree that your use of this service is at your
              own risk. We are not responsible for any damages or issues that
              may arise, including data loss, system errors, or interruptions in
              service. It is your responsibility to ensure that any services
              obtained through our platform meet your specific requirements.
            </SubSection>
            <SubSection title="Indemnification">
              By using our service, you agree to indemnify and hold Notevo
              harmless from any claims, actions, damages, liabilities, costs,
              and expenses including reasonable attorneys&apos; fees arising out
              of or in connection with your use of the service or any violation
              of these terms.
            </SubSection>
          </SectionBlock>

          <SectionBlock id="account" number="02" title="Account">
            <SubSection title="Account Management">
              We reserve the right to manage your account at our discretion.
              This includes the right to delete, suspend, or lock your account
              and associated data without prior notice for reasons including,
              but not limited to, violation of our terms of service, suspected
              fraudulent activities, or any actions that compromise the security
              and integrity of our platform.
            </SubSection>
            <SubSection title="Termination">
              We may terminate or suspend your account for any reason, including
              breach of these terms. In the event of termination, you will no
              longer have access to your account and any data associated with
              it. Notevo is not liable for any loss or damage that may result
              from the termination of your account.
            </SubSection>
            <SubSection title="Account Security">
              It is your responsibility to maintain the security of your account
              credentials. You agree not to share your login information with
              third parties. You are solely responsible for any activities that
              occur under your account.
            </SubSection>
            <SubSection title="Account Data">
              You can delete your account and all associated data at any time by
              going to your account settings page. Once your account is deleted,
              there is no way to recover your data.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="uptime"
            number="03"
            title="Uptime, Security & Privacy"
          >
            <SubSection title="Uptime">
              While we strive to maintain the availability of our services, we
              do not provide any service level agreement (SLA). The
              website&apos;s uptime may be subject to occasional interruptions,
              including maintenance, updates, or unforeseen technical issues.
            </SubSection>
            <SubSection title="Security">
              We implement reasonable security measures to protect the integrity
              of our platform. However, you acknowledge that no online service
              can be completely secure. We do not assume responsibility for any
              unauthorized access, data breaches, or other security incidents.
            </SubSection>
            <SubSection title="Privacy">
              Your privacy is important to us. Our privacy practices are
              outlined in our separate{" "}
              <Link
                href="/privacy-policy"
                className="text-primary underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              , which is an integral part of these terms. By using our services,
              you agree to the collection, use, and disclosure of your
              information as described in the Privacy Policy.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="copyright"
            number="04"
            title="Copyright & Content Ownership"
          >
            <SubSection title="Ownership of Generated Content">
              We do not claim any rights to the content generated within Notevo.
              The content you create remains your intellectual property.
            </SubSection>
            <SubSection title="Developer Protection">
              By using our service, you acknowledge that developers working on
              Notevo may explore and improve features conceptually similar to
              content generated within the platform. However, we respect user
              privacy and ownership rights.
            </SubSection>
          </SectionBlock>

          <SectionBlock id="features" number="05" title="Features & Bugs">
            <SubSection title="Continuous Improvement">
              We are dedicated to continuously adding new features and improving
              functionalities to enhance your experience. By agreeing to our
              terms, you acknowledge that the system may undergo changes over
              time.
            </SubSection>
            <SubSection title="Bug Fixes">
              Bugs are an inevitable part of any software system. While we
              strive to maintain a seamless experience, you understand that bugs
              may be identified and fixed as part of our ongoing development
              efforts.
            </SubSection>
            <SubSection title="Impact on User Experience">
              Changes to the system including new features or bug fixes may
              impact your overall experience. By agreeing to our terms, you
              accept that such changes are inherent in the nature of software
              development.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="ai"
            number="06"
            title="Use of AI & Third-Party Services"
          >
            <SubSection title="Third-Party Services">
              We utilize third-party services for authentication and artificial
              intelligence-powered features. These third-party services operate
              independently, and we are not responsible for their operations,
              performance, or any consequences arising from their use.
            </SubSection>
            <SubSection title="No Affiliation">
              We are not affiliated with the third-party AI services we employ.
              Any issues or concerns related to these services should be
              directed to the respective third-party providers.
            </SubSection>
            <SubSection title="User Responsibility">
              By using our service, you agree that it is your responsibility to
              familiarize yourself with the laws of your own country concerning
              the use of AI-generated content. Compliance with local laws and
              regulations is essential.
            </SubSection>
            <SubSection title="Continuous Improvement">
              AI systems are continually evolving. We appreciate your feedback
              in enhancing the quality of AI-powered features on Notevo.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="updates"
            number="07"
            title="Updates to Terms of Service"
          >
            <SubSection title="Right to Update">
              We reserve the right to update these terms of service at any time.
              Updates may be made to reflect changes in our services, legal
              requirements, or other considerations.
            </SubSection>
            <SubSection title="No Obligation to Notify">
              While we may make efforts to communicate significant changes, we
              are not obligated to notify users individually when updates occur.
              It is your responsibility to check back on these terms
              periodically.
            </SubSection>
            <SubSection title="Review of Terms">
              It&apos;s advisable to review these terms regularly to ensure that
              you are aware of any changes that may affect your use of Notevo.
              Your continued use of the service after updates indicates your
              agreement to be bound by the modified terms.
            </SubSection>
          </SectionBlock>
          <div
            className={cn(
              "pointer-events-auto w-full flex items-center justify-center mt-12 py-1.5",
            )}
          >
            <Button
              aria-label="Home"
              variant="link"
              className="cursor-pointer relative group flex justify-center items-center gap-0.5 text-foreground transition-all ease-in-out duration-150 hover:text-primary hover:no-underline"
              onMouseDown={() => router.push("/")}
            >
              <ChevronLeft
                size={16}
                className="transition-all ease-in-out duration-150 text-foreground absolute top-3 -left-0.5 group-hover:text-primary group-hover:-left-1.5"
              />
              Home
            </Button>
          </div>
        </MaxWContainer>
      </div>
    </div>
  );
}
