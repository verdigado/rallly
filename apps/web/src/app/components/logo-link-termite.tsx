import Link from "next/link";

export function LogoLinkTermite() {
  return (
    <Link
      className="inline-block transition-transform active:translate-y-1"
      href="/"
    >
      <svg className="h-[40px]" id="Ebene_2" data-name="Ebene 2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 288 288">
        <path style={{fill: '#000', strokeWidth: '0px'}} d="M252,69.95v-15.95c0-9.94-8.06-18-18-18H54c-9.94,0-18,8.06-18,18v16.12c-8.71,6.61-13.66,17.77-11.52,29.53l11.52,53.34v63.43c0,19.64,15.92,35.57,35.57,35.57h144.28c19.97,0,36.15-16.19,36.15-36.15v-62.85l11.58-53.67c2.13-11.73-2.85-22.86-11.58-29.39ZM245.91,95.88l-8.44,39.12h-22.25c-1.85-5.24-6.84-9-12.72-9s-10.86,3.76-12.72,9h-91.57c-1.85-5.24-6.84-9-12.72-9s-10.86,3.76-12.72,9h-22.26l-8.38-38.79c-.78-4.78,1.34-8.19,2.69-9.81,1.37-1.64,4.42-4.4,9.4-4.4h179.85c4.87,0,7.85,2.69,9.19,4.3,1.32,1.58,3.39,4.91,2.63,9.58ZM234,215.85c0,10.01-8.14,18.15-18.15,18.15H71.57c-9.69,0-17.57-7.88-17.57-17.57v-63.43h18.78c1.85,5.24,6.84,9,12.72,9s10.86-3.76,12.72-9h91.57c1.85,5.24,6.84,9,12.72,9s10.86-3.76,12.72-9h18.78v62.85Z"/>
      </svg>
    </Link>
  );
}
