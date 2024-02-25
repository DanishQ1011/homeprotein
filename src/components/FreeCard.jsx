export default function FreeCard(){
    return (
        <section className="mt-[6rem] p-[4rem] max-lg:p-[2rem] bg-[#f5f5f5] rounded-lg">
            <div className="flex flex-col justify-center gap-6 max-lg:gap-4 items-center">
                <p className="font-bold text-primary2">Try for just ₹99 only</p>
                <h1 className="text-[28px] text-primary2 font-bold max-sm:text-[23px] max-sm:text-center">2-days yummy protein-rich meals😋</h1>
                <a href="https://show.forms.app/devnm21/subscription-trial" target="_blank" rel="noopener noreferrer">
                    <button className="px-4 py-3 bg-black  text-white rounded-md">
                        Try it now
                    </button>
                </a>
            </div>
        </section>
    )
}