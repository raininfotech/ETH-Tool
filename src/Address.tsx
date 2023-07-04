import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { ChecksumAddress, Fieldset, PrivateKeyToAddress, PrivateKeyToPublicKey, PublicKeyToAddress } from "./home";

function Address() {
    let location = useLocation();
    return (
        <>
            <Helmet>
                <title>Eth Address Validator developer tools</title>
                <meta name="description" content="Eth address validator is a tool that will confirm that the address is valid as an Ethereum address." />
                <meta property="og:title" content="Eth Address Validator developer tools" />
                <meta property="og:description" content="Eth address validator is a tool that will confirm that the address is valid as an Ethereum address." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="col-6">
                    <Fieldset legend="Checksum Address" height="227px">
                        <section>
                            <ChecksumAddress />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Private Key to Address" height="227px">
                        <section>
                            <PrivateKeyToAddress />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Private Key to Public Key" height="227px">
                        <section>
                            <PrivateKeyToPublicKey />
                        </section>
                    </Fieldset>
                </div>
                <div className="col-6">
                    <Fieldset legend="Public Key to Address" height="227px">
                        <section>
                            <PublicKeyToAddress />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default Address;
