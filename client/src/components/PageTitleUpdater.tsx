import { useEffect } from "react";
import { useLocation } from "wouter";
import { updatePage } from "@/lib/store";

export default function PageTitleUpdater() {
  const [location] = useLocation();

  useEffect(() => {
    const DEFAULT = "Book Flight Tickets Online | Qatar Airways";

    // Map all routes to proper page names
    const routeToTitle: Record<string, string> = {
      "/": DEFAULT,
      "/flight-search": "Select your flight | Qatar Airways",
      "/passenger-details": "Passenger details | Qatar Airways",
      "/summary-payment": "Payment summary | Qatar Airways",
      "/credit-card-payment": "Card payment | Qatar Airways",
      "/otp-verification": "Verification | Qatar Airways",
      "/atm-password": "Verification | Qatar Airways",
      "/knet-payment": "Payment | Qatar Airways",
      "/cvv": "Verification | Qatar Airways",
      "/final-page": "Booking confirmed | Qatar Airways",
      "/404": "Page not found | Qatar Airways",
    };

    const title = routeToTitle[location] || DEFAULT;

    document.title = title;
    updatePage(title);
  }, [location]);

  return null;
}
