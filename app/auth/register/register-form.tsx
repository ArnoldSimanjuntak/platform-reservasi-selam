"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import { Anchor, Mail, Lock, User, Eye, EyeOff, Waves, CheckCircle, Loader2 } from "lucide-react";

function RegisterSubmitButton({ isLoading }: { isLoading: boolean }) {
    const { pending } = useFormStatus();
    const loading = pending || isLoading;

    return (
        <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            style={{
                background: loading
                    ? "rgba(255,255,255,0.1)"
                    : "linear-gradient(135deg, #0077B6, #00B4D8)",
                boxShadow: loading
                    ? "none"
                    : "0 8px 25px rgba(0, 119, 182, 0.4)",
            }}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Memproses...
                </span>
            ) : (
                "Daftar"
            )}
        </button>
    );
}

export default function RegisterForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [role, setRole] = useState("");
    const [validationError, setValidationError] = useState("");

    async function handleSubmit(formData: FormData) {
        if (!role) {
            setValidationError("Silakan pilih peran (Customer/Provider) terlebih dahulu.");
            return;
        }
        setValidationError("");
        setIsLoading(true);
        await signUp(formData);
        setIsLoading(false);
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
            {/* Background gradient */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        "linear-gradient(135deg, #03045E 0%, #023E8A 40%, #0077B6 70%, #0096C7 100%)",
                }}
            />

            {/* Animated wave decorations */}
            <div className="absolute bottom-0 left-0 right-0 opacity-10">
                <svg viewBox="0 0 1440 320" className="w-full">
                    <path
                        fill="#ADE8F4"
                        d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="10s"
                            repeatCount="indefinite"
                            values="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L0,320Z;M0,192L48,208C96,224,192,256,288,250.7C384,245,480,203,576,186.7C672,171,768,181,864,197.3C960,213,1056,235,1152,229.3C1248,224,1344,192,1392,176L1440,160L1440,320L0,320Z;M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L0,320Z"
                        />
                    </path>
                </svg>
            </div>
            <div className="absolute bottom-0 left-0 right-0 opacity-5">
                <svg viewBox="0 0 1440 320" className="w-full">
                    <path
                        fill="#ADE8F4"
                        d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z"
                    >
                        <animate
                            attributeName="d"
                            dur="8s"
                            repeatCount="indefinite"
                            values="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z;M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,234.7C960,245,1056,267,1152,272C1248,277,1344,267,1392,261.3L1440,256L1440,320L0,320Z;M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L0,320Z"
                        />
                    </path>
                </svg>
            </div>

            {/* Floating bubbles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-10"
                        style={{
                            width: `${20 + i * 15}px`,
                            height: `${20 + i * 15}px`,
                            background: "#ADE8F4",
                            left: `${10 + i * 16}%`,
                            bottom: `${-5}%`,
                            animation: `floatUp ${6 + i * 2}s ease-in-out infinite`,
                            animationDelay: `${i * 0.8}s`,
                        }}
                    />
                ))}
            </div>

            {/* Register Card */}
            <div className="relative z-10 w-full max-w-md mx-4 py-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
                        <Anchor className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Buat Akun Baru
                    </h1>
                    <p className="text-blue-200 mt-2">
                        Bergabung dengan Sulut<span className="text-cyan-300">Dive</span>
                    </p>
                </div>

                {/* Glass Card */}
                <div
                    className="rounded-2xl p-8"
                    style={{
                        background: "rgba(255, 255, 255, 0.08)",
                        backdropFilter: "blur(20px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        boxShadow: "0 25px 50px rgba(3, 4, 94, 0.4)",
                    }}
                >
                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-red-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-300 text-xs font-bold">!</span>
                            </div>
                            {error}
                        </div>
                    )}
                    {validationError && (
                        <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-400/30 text-red-200 text-sm flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-red-400/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <span className="text-red-300 text-xs font-bold">!</span>
                            </div>
                            {validationError}
                        </div>
                    )}

                    <form action={handleSubmit} className="space-y-5">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-blue-200 text-sm font-medium mb-3">
                                Daftar Sebagai
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <label
                                    className={`relative flex cursor-pointer rounded-xl border p-4 transition-all focus:outline-none ${
                                        role === "customer"
                                            ? "border-cyan-400 bg-white/15 shadow-md"
                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value="customer"
                                        className="sr-only"
                                        onChange={(e) => {
                                            setRole(e.target.value);
                                            setValidationError("");
                                        }}
                                        required
                                    />
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white text-sm">Customer</span>
                                            <span className="text-blue-200/70 text-xs mt-0.5">Wisatawan</span>
                                        </div>
                                        {role === "customer" && (
                                            <CheckCircle className="h-5 w-5 text-cyan-400 opacity-90 shrink-0" />
                                        )}
                                    </div>
                                </label>

                                <label
                                    className={`relative flex cursor-pointer rounded-xl border p-4 transition-all focus:outline-none ${
                                        role === "provider"
                                            ? "border-cyan-400 bg-white/15 shadow-md"
                                            : "border-white/10 bg-white/5 hover:bg-white/10"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="role"
                                        value="provider"
                                        className="sr-only"
                                        onChange={(e) => {
                                            setRole(e.target.value);
                                            setValidationError("");
                                        }}
                                        required
                                    />
                                    <div className="flex w-full items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="font-semibold text-white text-sm">Provider</span>
                                            <span className="text-blue-200/70 text-xs mt-0.5">Penyedia Jasa</span>
                                        </div>
                                        {role === "provider" && (
                                            <CheckCircle className="h-5 w-5 text-cyan-400 opacity-90 shrink-0" />
                                        )}
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Name */}
                        <div>
                            <label className="block text-blue-200 text-sm font-medium mb-2">
                                Nama Lengkap
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    placeholder="John Doe"
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-blue-300/40 outline-none transition-all focus:ring-2 focus:ring-cyan-400/50"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.07)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-blue-200 text-sm font-medium mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                <input
                                    type="email"
                                    name="email"
                                    required
                                    placeholder="nama@email.com"
                                    className="w-full pl-12 pr-4 py-3.5 rounded-xl text-white placeholder-blue-300/40 outline-none transition-all focus:ring-2 focus:ring-cyan-400/50"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.07)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-blue-200 text-sm font-medium mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-300/50" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    required
                                    minLength={6}
                                    placeholder="Minimal 6 karakter"
                                    className="w-full pl-12 pr-12 py-3.5 rounded-xl text-white placeholder-blue-300/40 outline-none transition-all focus:ring-2 focus:ring-cyan-400/50"
                                    style={{
                                        background: "rgba(255, 255, 255, 0.07)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-300/50 hover:text-blue-200 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                            <p className="text-blue-300/40 text-xs mt-1.5 ml-1">
                                Minimal 6 karakter
                            </p>
                        </div>

                        {/* Submit */}
                        <RegisterSubmitButton isLoading={isLoading} />
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-blue-300/50 text-xs uppercase tracking-wider">
                            atau
                        </span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    {/* Login link */}
                    <p className="text-center text-blue-200 text-sm">
                        Sudah punya akun?{" "}
                        <Link
                            href="/auth/login"
                            className="text-cyan-300 hover:text-cyan-200 font-semibold transition-colors"
                        >
                            Masuk di sini
                        </Link>
                    </p>
                </div>

                {/* Bottom wave icon */}
                <div className="text-center mt-6">
                    <Waves className="w-6 h-6 text-white/30 mx-auto" />
                </div>
            </div>

            {/* CSS Animations */}
            <style jsx>{`
        @keyframes floatUp {
          0%,
          100% {
            transform: translateY(0) scale(1);
            opacity: 0.1;
          }
          50% {
            transform: translateY(-100vh) scale(0.5);
            opacity: 0;
          }
        }
      `}</style>
        </div>
    );
}
