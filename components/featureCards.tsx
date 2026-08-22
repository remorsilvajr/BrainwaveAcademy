import Link from "next/link";
import { ReactNode } from "react";

interface FeatureCardProps {
    title: string;
    description: string;
    linkText: string;
    linkHref: string;
    icon: ReactNode;
}

export default function FeatureCard({
    title,
    description,
    linkText,
    linkHref,
    icon,
}: FeatureCardProps) {
    return (
        <Link
            href={linkHref}
            className="group flex flex-col items-center justify-center w-full md:w-[342px] h-[257px] bg-brand-cardBg border border-black rounded-card p-4 text-center hover:shadow-xl hover:border-brand-primary transition-all duration-200 no-underline cursor-pointer"
        >
            {/* Icon Circle */}
            <div className="w-[85px] h-[81px] bg-brand-secondary rounded-full flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                {icon}
            </div>

            <h3 className="font-heading text-[25px] font-semibold text-black mb-1">
                {title}
            </h3>
            <p className="font-body text-[15px] font-semibold text-black px-4 mb-3">
                {description}
            </p>

            {/* Styled text label (not a nested Link tag) */}
            <span className="font-button text-[20px] font-semibold text-brand-primary group-hover:underline">
                {linkText}
            </span>
        </Link>
    );
}