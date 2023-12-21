import Link from "next/link";

export default function FreeCard(){
    return (
        <section className="mt-[7rem] p-[4rem] bg-[#f5f5f5] rounded-lg">
            <div className="flex flex-col justify-center gap-6 items-center">
                <p className="font-bold text-primary2">Try for free!</p>
                <h1 className="text-[32px] text-primary2 font-bold">2-days yummy protein-rich meals😋</h1>
                <Link href='#/'>
                    <button className="px-4 py-3 bg-black text-white rounded-md">
                        Try it now
                    </button>
                </Link>
            </div>
        </section>
    )
}