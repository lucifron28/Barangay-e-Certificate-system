type SealImageProps = {
  className?: string;
  seal: "barangay-bato" | "mauban";
};

const SEAL_DETAILS = {
  "barangay-bato": {
    alt: "Barangay Bato seal",
    src: "/branding/barangay-bato-seal.png",
  },
  mauban: {
    alt: "Bayan ng Mauban seal",
    src: "/branding/mauban-seal.png",
  },
} as const;

export function SealImage({ className, seal }: SealImageProps) {
  const details = SEAL_DETAILS[seal];

  // A plain image keeps the seal available to browser print and PDF capture.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={details.src} alt={details.alt} className={className} />;
}
