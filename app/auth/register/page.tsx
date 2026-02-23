import { Suspense } from "react";
import RegisterForm from "./register-form";

export default function RegisterPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen flex items-center justify-center"
                    style={{
                        background: "linear-gradient(135deg, #03045E 0%, #023E8A 40%, #0077B6 70%, #0096C7 100%)",
                    }}
                >
                    <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full" />
                </div>
            }
        >
            <RegisterForm />
        </Suspense>
    );
}
