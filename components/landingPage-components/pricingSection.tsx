"use client";

import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { pricingPlans } from "@/lib/data";

type CurrencyCode = keyof typeof CURRENCIES;
type CurrencySymbol = (typeof CURRENCIES)[CurrencyCode]["symbol"];

const CURRENCIES = {
  USD: { symbol: "$", rate: 1 },
  EGP: { symbol: "LE", rate: 30 },
  SAR: { symbol: "SAR", rate: 3.75 },
  EUR: { symbol: "€", rate: 0.91 },
  GBP: { symbol: "£", rate: 0.78 },
} as const;

const DEFAULT_CURRENCY = "USD";

export default function PricingSection() {
  const [currency, setCurrency] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [currencySymbol, setCurrencySymbol] = useState<CurrencySymbol>(
    CURRENCIES[DEFAULT_CURRENCY].symbol,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function detectUserLocation() {
      try {
        const response = await fetch("https://ipapi.co/json/");
        const data = await response.json();

        switch (data.country_code) {
          case "EG":
            setCurrency("EGP");
            setCurrencySymbol(CURRENCIES.EGP.symbol);
            break;
          case "SA":
            setCurrency("SAR");
            setCurrencySymbol(CURRENCIES.SAR.symbol);
            break;
          case "US":
            setCurrency("USD");
            setCurrencySymbol(CURRENCIES.USD.symbol);
            break;
          case "GB":
            setCurrency("GBP");
            setCurrencySymbol(CURRENCIES.GBP.symbol);
            break;
          case "DE":
          case "FR":
          case "IT":
          case "ES":
          case "NL":
          case "BE":
          case "AT":
          case "IE":
          case "FI":
          case "PT":
          case "GR":
            setCurrency("EUR");
            setCurrencySymbol(CURRENCIES.EUR.symbol);
            break;
          default:
            setCurrency(DEFAULT_CURRENCY);
            setCurrencySymbol(CURRENCIES[DEFAULT_CURRENCY].symbol);
        }
      } catch (error) {
        console.error("Failed to detect location:", error);
        setCurrency(DEFAULT_CURRENCY);
        setCurrencySymbol(CURRENCIES[DEFAULT_CURRENCY].symbol);
      } finally {
        setIsLoading(false);
      }
    }

    detectUserLocation();
  }, []);

  const getPrice = (basePrice: number) => {
    const conversionRate = CURRENCIES[currency].rate;
    return (basePrice * conversionRate).toFixed(2);
  };

  return (
    <section id="pricing" className="relative py-24 overflow-hidden">
      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the perfect plan for your needs
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {Object.entries(pricingPlans).map(([key, plan], index) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 app-radius-2xl blur-xl group-hover:blur-2xl transition-all duration-500" />
              <Card
                className={cn(
                  "relative bg-background/50 backdrop-blur-xl border border-border app-radius-2xl transition-all duration-300 hover:border-primary/20",
                  key === "pro" &&
                    "border-primary/30 bg-gradient-to-b from-secondary/40 to-secondary/60",
                )}
              >
                <CardHeader className="pb-8">
                  <CardTitle className="text-2xl text-foreground">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    {plan.description}
                  </CardDescription>
                  <div className="mt-4 flex items-baseline text-foreground">
                    <span className="text-4xl font-extrabold tracking-tight">
                      {currencySymbol}
                      {getPrice(plan.price)}
                    </span>
                    <span className="ml-1 text-xl font-semibold">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="pb-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: 0.6 + idx * 0.1 }}
                      >
                        <PricingFeature included={feature.included}>
                          {feature.name}
                        </PricingFeature>
                      </motion.div>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    variant={key === "pro" ? "default" : "outline"}
                    size="lg"
                    className={cn(
                      "w-full transition-all duration-300",
                      key === "pro"
                        ? "bg-primary hover:bg-primary/90"
                        : "border-border hover:border-primary/30",
                    )}
                    asChild
                  >
                    <Link href="/signin">
                      {key === "pro" ? "Upgrade to Pro" : "Get Started"}
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

interface PricingFeatureProps {
  children: React.ReactNode;
  included?: boolean;
}

function PricingFeature({ children, included = false }: PricingFeatureProps) {
  return (
    <li className="flex items-center">
      {included ? (
        <Check className="h-5 w-5 text-emerald-500 mr-2 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-muted-foreground/30 mr-2 flex-shrink-0" />
      )}
      <span
        className={included ? "text-foreground/90" : "text-muted-foreground/50"}
      >
        {children}
      </span>
    </li>
  );
}
