interface IconProps {
    name: "program" | "calendar" | "megaphone";
}

const paths = {
    program: "M4.57825 13.2394H13.7348M4.57825 22.0656...",
    calendar: "M20 4.58333V11.4583M40 4.58333V11.4583...",
    megaphone: "M13.7348 30.8919C13.7348 36.6211 15.6626...",
};

export default function Icon({ name }: IconProps) {
    return (
        <svg width="45" height="43" viewBox="0 0 55 53" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d={paths[name]}
                stroke="#006BAD"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}