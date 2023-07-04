import { providers } from "ethers";
import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { Fieldset, FourByteDictionary, GasCostCalculator, MethodSignatureGenerator } from "./home";

function Tools() {
    let location = useLocation();
    const [rpcProvider] = useState<providers.Provider>(() => {
        try {
            const net = localStorage.getItem("networkOption") || "mainnet";
            const url = localStorage.getItem("rpcProviderUrl");
            if (url) {
                return new providers.StaticJsonRpcProvider(url.replace("{network}", net));
            }

            if (net === "injected" && (window as any).ethereum) {
                return new providers.Web3Provider((window as any).ethereum, "any");
            }

            return providers.getDefaultProvider(net);
        } catch (err) {
            console.error(err);
        }

        return providers.getDefaultProvider("mainnet");
    });

    return (
        <>
            <Helmet>
                <title>Contract Method Signature Tools</title>
                <meta name="description" content="Contract method signature tools can be used for smart contract functions and event signatures." />
                <meta property="og:title" content="Contract Method Signature Tools" />
                <meta property="og:description" content="Contract method signature tools can be used for smart contract functions and event signatures." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-6">
                    <Fieldset legend="Method and Event Topic Signature Generator" height="400px">
                        <section>
                            <MethodSignatureGenerator />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="4byte dictionary" height="400px">
                        <section>
                            <FourByteDictionary />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Gas Cost Calculator" height="400px">
                        <section>
                            <GasCostCalculator provider={rpcProvider} />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default Tools;
