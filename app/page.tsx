import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <h1 className="text-4xl font-bold">HTML & CSS Generator</h1>
        <p className="text-xl text-gray-600">
          Create beautiful landing pages with AI-generated HTML & CSS
        </p>
        <div className="flex flex-col space-y-4">
          <Link href="/login">
            <Button className="w-full" size="lg">
              Login
            </Button>
          </Link>
          <Link href="/register">
            <Button className="w-full" variant="outline" size="lg">
              Register
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
