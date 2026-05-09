[33mcommit f929e908d6399e899c2d690b062ea4aef6d3405e[m[33m ([m[1;36mHEAD -> [m[1;32mmain[m[33m)[m
Author: ArnoldSimanjuntak <arnoldjuntak16@gmail.com>
Date:   Fri May 8 18:17:47 2026 +0800

    Mau Lulus lagi 7

[1mdiff --git a/components/ServiceDetailClient.tsx b/components/ServiceDetailClient.tsx[m
[1mindex fbe54aa..f679443 100644[m
[1m--- a/components/ServiceDetailClient.tsx[m
[1m+++ b/components/ServiceDetailClient.tsx[m
[36m@@ -5,16 +5,14 @@[m [mimport { useState, useEffect } from "react";[m
 import {[m
     MapPin,[m
     Star,[m
[31m-    CheckCircle2,[m
[31m-    XCircle,[m
[31m-    Camera,[m
     Anchor,[m
[31m-    Wifi,[m
[31m-    Utensils,[m
     Ship,[m
     Clock,[m
     Info,[m
     ShieldAlert,[m
[32m+[m[32m    Users,[m
[32m+[m[32m    Package,[m
[32m+[m[32m    Tag,[m
 } from "lucide-react";[m
 import type { Service, DiveSite } from "@/lib/supabase";[m
 import BookingForm from "@/components/BookingForm";[m
[36m@@ -66,29 +64,61 @@[m [mexport default function ServiceDetailClient({ service, initialIsLoggedIn, initia[m
     const isBoat = service.type === "boat";[m
     const heroImage = service.image_url || "/images/lembeh-map.png";[m
 [m
[31m-    // Dummy features data based on service type[m
[31m-    const features = [[m
[31m-        { icon: Camera, label: "Camera Room", description: "Dedicated room for rinsing & camera setup" },[m
[31m-        { icon: Anchor, label: "Dive Guide", description: "1:4 guide to diver ratio" },[m
[31m-        { icon: Wifi, label: "Free Wi-Fi", description: "Satellite connection on the boat" },[m
[31m-        { icon: Utensils, label: "Lunch", description: "Manadonese buffet lunch" },[m
[31m-        { icon: Ship, label: "Speedboat", description: "Twin engine 200PK" },[m
[31m-        { icon: Clock, label: "Duration", description: "8 Hours (08:00 - 16:00)" },[m
[31m-    ];[m
[32m+[m[32m    const serviceTypeLabel: Record<string, string> = {[m
[32m+[m[32m        boat: "Kapal",[m
[32m+[m[32m        instructor: "Instruktur / Guide",[m
[32m+[m[32m        gear: "Peralatan Selam",[m
[32m+[m[32m    };[m
 [m
[31m-    const includes = [[m
[31m-        "Hotel pickup from Bitung area",[m
[31m-        "3x Dives (Tank & Weight)",[m
[31m-        "Lunch & snacks",[m
[31m-        "Clean towels",[m
[31m-        "First Aid & Emergency Oxygen",[m
[32m+[m[32m    const serviceFacts = [[m
[32m+[m[32m        {[m
[32m+[m[32m            icon: Tag,[m
[32m+[m[32m            label: "Tipe Layanan",[m
[32m+[m[32m            description: serviceTypeLabel[service.type] ?? service.type,[m
[32m+[m[32m        },[m
[32m+[m[32m        {[m
[32m+[m[32m            icon: Users,[m
[32m+[m[32m            label: isGear ? "Jumlah Unit" : "Kapasitas Maksimal",[m
[32m+[m[32m            description: isGear[m
[32m+[m[32m                ? `${service.max_capacity} unit tersedia per hari`[m
[32m+[m[32m                : `${service.max_capacity} peserta per hari`,[m
[32m+[m[32m        },[m
[32m+[m[32m        ...(service.provider?.name[m
[32m+[m[32m            ? [{[m
[32m+[m[32m                icon: Anchor,[m
[32m+[m[32m                label: "Penyedia",[m
[32m+[m[32m                description: service.provider.name,[m
[32m+[m[32m            }][m
[32m+[m[32m            : []),[m
[32m+[m[32m        ...(service.provider?.location[m
[32m+[m[32m            ? [{[m
[32m+[m[32m                icon: MapPin,[m
[32m+[m[32m                label: "Lokasi Provider",[m
[32m+[m[32m                description: service.provider.location,[m
[32m+[m[32m            }][m
[32m+[m[32m            : []),[m
[32m+[m[32m        ...(service.dive_site_category[m
[32m+[m[32m            ? [{[m
[32m+[m[32m                icon: Ship,[m
[32m+[m[32m                label: "Kategori Spot",[m
[32m+[m[32m                description: service.dive_site_category,[m
[32m+[m[32m            }][m
[32m+[m[32m            : []),[m
[32m+[m[32m        {[m
[32m+[m[32m            icon: Clock,[m
[32m+[m[32m            label: "Ketersediaan",[m
[32m+[m[32m            description: service.is_available === false ? "Tidak tersedia" : "Tersedia untuk dipesan",[m
[32m+[m[32m        },[m
     ];[m
 [m
[31m-    const excludes = [[m
[31m-        "Gear rental (BCD, Regulator, Wetsuit)",[m
[31m-        "Marine park entry fee",[m
[31m-        "Tips for crew & guide",[m
[31m-        "Photo/video documentation",[m
[32m+[m[32m    const bookingNotes = [[m
[32m+[m[32m        isBoat[m
[32m+[m[32m            ? "Wisatawan memilih spot selam dan tanggal pada formulir pemesanan."[m
[32m+[m[32m            : "Wisatawan memilih tanggal dan jumlah sesuai ketersediaan layanan.",[m
[32m+[m[32m        "Fasilitas tambahan hanya berlaku jika dicantumkan langsung pada deskripsi layanan.",[m
[32m+[m[32m        service.provider?.contact[m
[32m+[m[32m            ? `Kontak provider: ${service.provider.contact}`[m
[32m+[m[32m            : "Kontak provider belum dicantumkan.",[m
     ];[m
 [m
     const formatPrice = (price: number) => {[m
[36m@@ -154,18 +184,15 @@[m [mexport default function ServiceDetailClient({ service, initialIsLoggedIn, initia[m
                         <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">[m
                             <h2 className="text-2xl font-bold text-deepSea mb-4">About This Service</h2>[m
                             <p className="text-gray-600 leading-relaxed text-lg">[m
[31m-                                {service.description || "Enjoy the best diving experience in Lembeh Strait with us. This service is specially designed for macro photographers and muck diving enthusiasts looking for comfort and personalized service."}[m
[31m-                            </p>[m
[31m-                            <p className="text-gray-600 leading-relaxed text-lg mt-4">[m
[31m-                                Guided by certified dive masters who know every inch of Lembeh&apos;s black sand, you will easily find rare &quot;Critters&quot; like the Blue Ring Octopus, Flamboyant Cuttlefish, and Hairy Frogfish.[m
[32m+[m[32m                                {service.description || "Provider belum menambahkan deskripsi layanan. Detail fasilitas dan ketentuan sebaiknya dikonfirmasi sebelum memesan."}[m
                             </p>[m
                         </div>[m
 [m
[31m-                        {/* Facilities */}[m
[32m+[m[32m                        {/* Service Facts */}[m
                         <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">[m
[31m-                            <h2 className="text-2xl font-bold text-deepSea mb-6">Facilities & Key Features</h2>[m
[32m+[m[32m                            <h2 className="text-2xl font-bold text-deepSea mb-6">Informasi Layanan</h2>[m
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">[m
[31m-                                {features.map((feature, idx) => ([m
[32m+[m[32m                                {serviceFacts.map((feature, idx) => ([m
                                     <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">[m
                                         <div className="bg-white p-2.5 rounded-lg shadow-sm text-primary">[m
                                             <feature.icon className="w-6 h-6" />[m
[36m@@ -179,39 +206,17 @@[m [mexport default function ServiceDetailClient({ service, initialIsLoggedIn, initia[m
                             </div>[m
                         </div>[m
 [m
[31m-                        {/* Includes / Excludes */}[m
[32m+[m[32m                        {/* Booking Notes */}[m
                         <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100">[m
[31m-                            <h2 className="text-2xl font-bold text-deepSea mb-6">Package Details</h2>[m
[31m-                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">[m
[31m-                                <div>[m
[31m-                                    <h3 className="font-semibold text-green-700 mb-4 flex items-center gap-2">[m
[31m-                                        <CheckCircle2 className="w-5 h-5" />[m
[31m-                                        What&apos;s Included[m
[31m-                                    </h3>[m
[31m-                                    <ul className="space-y-3">[m
[31m-                                        {includes.map((item, idx) => ([m
[31m-                                            <li key={idx} className="flex items-start gap-3 text-gray-600">[m
[31m-                                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-1 shrink-0" />[m
[31m-                                                <span className="text-sm">{item}</span>[m
[31m-                                            </li>[m
[31m-                                        ))}[m
[31m-                                    </ul>[m
[31m-                                </div>[m
[31m-                                <div>[m
[31m-                                    <h3 className="font-semibold text-red-700 mb-4 flex items-center gap-2">[m
[31m-                                        <XCircle className="w-5 h-5" />[m
[31m-                                        What&apos;s Excluded[m
[31m-                                    </h3>[m
[31m-                                    <ul className="space-y-3">[m
[31m-                                        {excludes.map((item, idx) => ([m
[31m-                                            <li key={idx} className="flex items-start gap-3 text-gray-600">[m
[31m-                                                <XCircle className="w-4 h-4 text-red-500 mt-1 shrink-0" />[m
[31m-                                                <span className="text-sm">{item}</span>[m
[31m-                                            </li>[m
[31m-                                        ))}[m
[31m-                                    </ul>[m
[31m-                                </div>[m
[31m-                            </div>[m
[32m+[m[32m                            <h2 className="text-2xl font-bold text-deepSea mb-6">Catatan Pemesanan</h2>[m
[32m+[m[32m                            <ul className="space-y-3">[m
[32m+[m[32m                                {bookingNotes.map((item, idx) => ([m
[32m+[m[32m                                    <li key={idx} className="flex items-start gap-3 text-gray-600">[m
[32m+[m[32m                                        <Package className="w-4 h-4 text-primary mt-1 shrink-0" />[m
[32m+[m[32m                                        <span className="text-sm">{item}</span>[m
[32m+[m[32m                                    </li>[m
[32m+[m[32m                                ))}[m
[32m+[m[32m                            </ul>[m
                         </div>[m
 [m
                     </div>[m
[36m@@ -278,7 +283,7 @@[m [mexport default function ServiceDetailClient({ service, initialIsLoggedIn, initia[m
                             <div className="bg-blue-50 rounded-xl p-4 flex items-start gap-3 border border-blue-100">[m
                                 <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />[m
                                 <p className="text-xs text-blue-800 leading-relaxed">[m
[31m-                                    <strong>Best Price Guarantee:</strong> If you find a lower price for the same package, we&apos;ll match it.[m
[32m+[m[32m                                    <strong>Catatan:</strong> Informasi fasilitas mengikuti deskripsi yang ditulis provider atau admin pada layanan ini.[m
                                 </p>[m
                             </div>[m
                         </div>[m
