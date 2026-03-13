"use client";
import { Features } from "@/lib/data";
import { motion } from "framer-motion";
import MaxWContainer from "@/components/ui/MaxWContainer";
import SectionHeading from "./SectionHeading";
import Section from "../ui/Section";
import { NOISE_PNG } from "@/lib/data";

const featureVideos: Record<string, string> = {
  "Rich Text Editor":
    "https://ik.imagekit.io/1u6qts3nc/notevo/notevo-texteditor.mp4?updatedAt=1773361580638",
  "Simple Organization":
    "https://ik.imagekit.io/1u6qts3nc/notevo/notevo-workingspace2.mp4?updatedAt=1773361566067",
  "Publish Your Notes":
    "https://ik.imagekit.io/1u6qts3nc/notevo/notevo-Publish.mp4?updatedAt=1773361648321",
  "Download Your Stuff":
    "https://ik.imagekit.io/1u6qts3nc/notevo/notevo-Downloadyourstufff.mp4?updatedAt=1773361630479",
};

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = (x: number) => ({
  hidden: { opacity: 0, x, y: 24 },
  visible: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
});

export default function FeaturesSection() {
  return (
    <Section sectionId="features" className="relative overflow-hidden bg-muted">
      {/* Real PNG grain noise overlay — always light mode, fixed values */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0 "
        style={{
          backgroundImage: `url(${NOISE_PNG})`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
          opacity: 0.07,
          mixBlendMode: "multiply",
          zIndex: 5,
        }}
      />
      <MaxWContainer className="relative z-10">
        <SectionHeading
          SectionTitle="Features you'll love"
          SectionSubTitle="Everything you need to take your notes without the hassle."
        />

        <div className="space-y-24">
          {Features.map((feature, index) => {
            const isEven = index % 2 === 0;
            const videoSrc = featureVideos[feature.title];
            return (
              <motion.div
                key={index}
                variants={containerVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-80px" }}
                className={`flex flex-col ${
                  isEven ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 md:gap-12 items-center`}
              >
                {/* Video Side */}
                <motion.div
                  variants={itemVariants(isEven ? -40 : 40)}
                  className="w-full md:w-2/3"
                >
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 from-50% to-transparent border-border rounded-lg" />
                    <div className="relative bg-gradient-to-br from-primary/10 from-50% to-transparent border-border rounded-lg p-1 Desktop:p-2 overflow-hidden">
                      <video
                        src={videoSrc}
                        autoPlay
                        loop
                        muted
                        playsInline
                        disablePictureInPicture
                        disableRemotePlayback
                        className="w-full h-full object-cover rounded-lg"
                        style={{ pointerEvents: "none" }}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Text Side */}
                <motion.div
                  variants={itemVariants(isEven ? 40 : -40)}
                  className="w-full md:w-1/2 "
                >
                  <div className=" Desktop:h-80 flex flex-col justify-end items-start">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="relative bg-primary/10 rounded-lg p-3">
                        <feature.icon className="w-8 h-8 text-primary" />
                      </div>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">
                      {feature.title}
                    </h3>

                    <p className="text-lg text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </MaxWContainer>
    </Section>
  );
}
