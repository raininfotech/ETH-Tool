import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { ContentHashCoder, Fieldset, IpfsCoder, IPNSContentHash } from "./home";

function Utilities() {
    let location = useLocation();
    return (
        <>
            <Helmet>
                <title>ipfs coder developer tool</title>
                <meta
                    name="description"
                    content="The IPFS coder tool is a command-line tool that allows you to encode, decode, and explore IPFS objects. It is a powerful tool that can be used to interact with the IPFS network."
                />
                <meta property="og:title" content="ipfs coder developer tool" />
                <meta
                    property="og:description"
                    content="The IPFS coder tool is a command-line tool that allows you to encode, decode, and explore IPFS objects. It is a powerful tool that can be used to interact with the IPFS network."
                />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-6">
                    <Fieldset legend="IPFS coder" height="400px">
                        <section>
                            <IpfsCoder />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="ContentHash coder" height="400px">
                        <section>
                            <ContentHashCoder />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="IPNS ContentHash" height="400px">
                        <section>
                            <IPNSContentHash />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default Utilities;
