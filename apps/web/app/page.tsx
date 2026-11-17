import Link from "next/link";
import LoginPage from "./login/page";

export default function Home() {
  return (
    <>
      {/* <div className="first">Acceuil SRB </div>
      <Link href="/login">Login</Link> */}
      <LoginPage />
    </>
  );
}