import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-[#0f281c]">
      <section className="w-full max-w-lg rounded-3xl border border-[#a3d9be] bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2d6a4f]">
          WebinarKit
        </p>
        <h1 className="mt-3 text-2xl font-bold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-[#456357]">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href="/provider"
          className="mt-6 inline-block rounded-full bg-[#183d30] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Return to Workspace
        </Link>
      </section>
    </main>
  );
}
