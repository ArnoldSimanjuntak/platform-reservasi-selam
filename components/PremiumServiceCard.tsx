import ServiceCard from "@/components/ServiceCard";
import type { Service } from "@/lib/supabase";

interface PremiumServiceCardProps {
    service: Service;
}

export default function PremiumServiceCard({ service }: PremiumServiceCardProps) {
    return <ServiceCard service={service} />;
}
