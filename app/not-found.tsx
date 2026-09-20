import Link from "next/link";
import { Button } from "@/components/ui/button";
import imgsrc from "@/public/Notevo-logo.svg";
import Image from "next/image";
import MaxWContainer from "@/components/ui/MaxWContainer";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <section className="relative flex min-h-svh flex-col items-center justify-center bg-background overflow-hidden">
      <MaxWContainer className="flex flex-col items-center justify-center gap-4 *:text-center relative px-4 sm:px-6 lg:px-8">
        <div className=" px-2 w-full gap-2 flex justify-start items-center ">
          <Image
            src={imgsrc}
            alt="Notevo Logo"
            priority
            width={20}
            height={20}
          />
          <p className="text-base text-foreground font-semibold">Notevo.me</p>
        </div>
        <Card className="overflow-hidden bg-card border-border min-w-[300px] max-w-2xl w-full">
          <CardContent className="relative pt-4 pb-16">
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <h2 className="text-5xl md:text-7xl text-muted-foreground font-bold">
                404 Not Found
              </h2>
              <p className="text-muted-foreground text-sm md:text-base font-medium px-2 py-1">
                Could not find requested resource
              </p>
            </div>
            <Button className=" absolute bottom-0 right-0 w-auto mt-4 h-9 px-6">
              <Link href="/">Return Home</Link>
            </Button>
          </CardContent>
        </Card>
        <div className="w-full flex justify-center items-center">
          <p className="text-muted-foreground text-xs font-medium px-2 max-w-lg">
            ! Hi this is Notevo's team we're really sorry but i think we dont
            have a this page If the problem keeps happening, email us at{" "}
            <Link
              href="mailto:support@notevo.me"
              className=" font-bold text-foreground hover:underline"
            >
              support@notevo.me
            </Link>{" "}
            and we'll help you out. but for now Return Home
          </p>
        </div>
      </MaxWContainer>
    </section>
  );
}
