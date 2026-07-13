import Image from "next/image";
import Link from "next/link";
import { ArrowRight, MapPin, Ship, UserCheck, Wrench } from "lucide-react";
import type { Service } from "@/lib/supabase";
import { getServiceTypeLabel } from "@/lib/service-types";
import { formatRupiah } from "@/lib/formatters";

interface ServiceCardProps {
    service: Service;
}

function getServiceIcon(type: Service["type"]) {
    if (type === "instructor") return UserCheck;
    if (type === "gear") return Wrench;
    return Ship;
}

export default function ServiceCard({ service }: ServiceCardProps) {
    const previewImage = service.image_url || "/images/lembeh-map.jpg";
    const ServiceIcon = getServiceIcon(service.type);

    return (
        <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
            <Link
                href={`/services/${service.id}`}
                className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
                aria-label={`Lihat detail ${service.name}`}
            >
                <Image
                    src={previewImage}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-slate-950/55 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md">
                    <ServiceIcon className="h-3.5 w-3.5" />
                    {getServiceTypeLabel(service.type)}
                </span>
                {service.dive_site_category ? (
                    <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm">
                        <MapPin className="h-3 w-3 text-secondary" />
                        {service.dive_site_category}
                    </span>
                ) : null}
            </Link>

            <div className="flex flex-1 flex-col p-5">
                <div className="min-w-0">
                    <h3 className="line-clamp-2 text-lg font-extrabold leading-snug text-slate-900">
                        <Link href={`/services/${service.id}`} className="hover:text-primary">
                            {service.name}
                        </Link>
                    </h3>
                    {service.provider?.name ? (
                        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                            Oleh {service.provider.name}
                        </p>
                    ) : null}
                    <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-slate-600">
                        {service.description || "Informasi lengkap layanan tersedia pada halaman detail."}
                    </p>
                </div>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mulai dari</p>
                        <p className="truncate text-lg font-extrabold text-deepSea">{formatRupiah(service.price)}</p>
                    </div>
                    <Link
                        href={`/services/${service.id}`}
                        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-primary transition-colors hover:bg-primary hover:text-white"
                        aria-label={`Buka ${service.name}`}
                    >
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </article>
    );
}
