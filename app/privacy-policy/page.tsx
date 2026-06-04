"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import MaxWContainer from "@/components/ui/MaxWContainer";
import { useMediaQuery } from "react-responsive";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
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
        <h2 className="text-xl font-semibold text-primary tracking-tight">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

export default function PrivacyPage() {
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 640 });

  const router = useRouter();
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 80);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className=" relative force-light fadeUp bg-background text-foreground flex flex-col min-h-screen">
      <div className="flex-grow">
        <MaxWContainer className="max-w-[760px] mx-auto px-6 pb-44">
          {/* Hero */}
          <div className="pt-16 pb-10 opacity-0 translate-y-3 animate-[fadeUp_0.4s_0.05s_ease_forwards]">
            <div className="text-[0.68rem] tracking-widest uppercase mb-0.5 opacity-60">
              <p className="leading-tight text-[0.78rem] font-semibold text-primary">
                Last Modified: December 2, 2025
              </p>
            </div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold text-primary leading-tight tracking-tight mb-3">
              Notevo Privacy Policy
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
              Notevo (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
              provides this Privacy Policy to inform you of our policies
              regarding the collection, use, and disclosure of personal
              information. Questions? Contact us at{" "}
              <a
                href="mailto:support@notevo.me"
                className="text-primary underline underline-offset-2"
              >
                support@notevo.me
              </a>
              .
            </p>
          </div>

          {/* Sections */}
          <SectionBlock id="consent" number="01" title="Consent">
            <SubSection title="Your Agreement">
              By using our website, you hereby consent to our Privacy Policy and
              agree to its terms. This Privacy Policy applies only to our online
              activities and is valid for visitors to our website with regards
              to the information that they share and/or collect in Notevo. This
              policy is not applicable to any information collected offline or
              via channels other than this website.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="collection"
            number="02"
            title="Information We Collect"
          >
            <SubSection title="Personal Information">
              When you sign up, we collect your name, email, and profile picture
              from your Google account. We use this information for
              personalization and essential communication with you. We never
              sell your data.
            </SubSection>
            <SubSection title="Voluntary Correspondence">
              We retain questions or assistance requests, including your email
              address, for future reference and support.
            </SubSection>
            <SubSection title="Marketing Communications">
              Your email may be used for direct marketing and support. You can
              unsubscribe at any time, and we will promptly delete your
              information upon request.
            </SubSection>
          </SectionBlock>

          <SectionBlock id="yourdata" number="03" title="Your Data">
            <SubSection title="Retention & Deletion">
              Deleted data may remain in our database while your account is
              active. When you delete your account, all of your data is removed
              from our database. Retrieving data from backups is impractical.
            </SubSection>
          </SectionBlock>

          <SectionBlock id="links" number="04" title="Links to Other Sites">
            <SubSection title="Third-Party Links">
              Our services may contain links to other websites, applications,
              and online services. If you choose to visit a third-party service
              or click on a third-party link, you will be directed to that third
              party&apos;s website, application, or online service. The fact
              that we link to a website or content is not an endorsement,
              authorization, or representation of our affiliation with that
              third party, nor is it an endorsement of their privacy or
              information security policies or practices. We do not exercise
              control over third-party websites or services.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="thirdparty"
            number="05"
            title="Third-Party Privacy Policies"
          >
            <SubSection title="External Policies">
              Our Privacy Policy does not apply to other websites. Thus, we
              advise you to consult the respective Privacy Policies of these
              third-party services for more detailed information. This may
              include their practices and instructions on how to opt-out of
              certain options.
            </SubSection>
            <SubSection title="Cookie Settings">
              You can choose to disable cookies through your individual browser
              settings. More detailed information about cookie management with
              specific web browsers can be found on the browsers&apos;
              respective websites.
            </SubSection>
          </SectionBlock>

          <SectionBlock id="cookies" number="06" title="Cookies">
            <SubSection title="What Are Cookies?">
              Cookies are small pieces of data stored on your device by your
              browser. They serve various purposes, such as remembering your
              preferences, enhancing user experience, and facilitating
              authentication.
            </SubSection>
            <SubSection title="Google OAuth Cookies">
              At our Site, we utilize Google OAuth to secure and streamline the
              login process. When you log in using Google OAuth, a cookie is
              generated and stored on your device. This cookie is essential for
              the proper functioning of our authentication system and contains a
              unique identifier that helps us recognize your authenticated
              session, enabling seamless access without re-entering your
              credentials repeatedly during a single session.
            </SubSection>
            <SubSection title="How They Work">
              These cookies do not store personal information directly on our
              servers. Instead, they serve as tokens that establish a secure
              connection between your browser and the authentication provider,
              in this case, Google. By using our Site and opting for third-party
              authentication, you consent to the use of cookies for
              authentication purposes. You can manage your cookie preferences
              through your browser settings.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="gdpr"
            number="07"
            title="GDPR Data Protection Rights"
          >
            <SubSection title="Right to Access">
              You have the right to request copies of your personal data. We may
              charge you a small fee for this service.
            </SubSection>
            <SubSection title="Right to Rectification">
              You have the right to request that we correct any information you
              believe is inaccurate. You also have the right to request that we
              complete any information you believe is incomplete.
            </SubSection>
            <SubSection title="Right to Erasure">
              You have the right to request that we erase your personal data,
              under certain conditions.
            </SubSection>
            <SubSection title="Right to Restrict Processing">
              You have the right to request that we restrict the processing of
              your personal data, under certain conditions.
            </SubSection>
            <SubSection title="Right to Object to Processing">
              You have the right to object to our processing of your personal
              data, under certain conditions.
            </SubSection>
            <SubSection title="Right to Data Portability">
              You have the right to request that we transfer the data we have
              collected to another organization, or directly to you, under
              certain conditions.
            </SubSection>
          </SectionBlock>

          <SectionBlock
            id="changes"
            number="08"
            title="Changes to This Privacy Policy"
          >
            <SubSection title="Revisions">
              This Privacy Policy may be revised periodically, and this will be
              reflected by a &quot;Last Modified&quot; date below. We advise you
              to review this page periodically for any changes. We will notify
              you of any changes by posting the new Privacy Policy on this page.
              These changes are effective immediately upon posting.
            </SubSection>
          </SectionBlock>
        </MaxWContainer>
        <div
          className={cn(
            "pointer-events-auto w-full flex items-center justify-center mt-12 py-1.5",
          )}
        >
          <Button
            aria-label="Home"
            variant="link"
            className="cursor-pointer relative group flex justify-center items-center gap-0.5 text-foreground transition-all ease-in-out duration-150 hover:text-primary hover:no-underline"
            onMouseDown={() => router.back()}
          >
            <ChevronLeft
              size={16}
              className="transition-all ease-in-out duration-150 text-foreground absolute top-2.5 -left-0.5 group-hover:text-primary group-hover:-left-1.5"
            />
            Home
          </Button>
        </div>
      </div>
    </div>
  );
}
