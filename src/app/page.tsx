import { negocio } from "@/negocio.config";
import { Landing } from "@/components/Landing";

export default function Home() {
  return <Landing negocio={negocio} />;
}
