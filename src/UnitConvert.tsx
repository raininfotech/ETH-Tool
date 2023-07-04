import React from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";
import { Fieldset, UnitConverter } from "./home";

function UnitConvert() {
    let location = useLocation();
    return (
        <>
            <Helmet>
                <title>Ethereum unit converter Tool</title>
                <meta name="description" content="Ethereum unit converter tools can help to ensure that users are using the correct units when interacting with the Ethereum network." />
                <meta property="og:title" content="Ethereum unit converter Tool" />
                <meta property="og:description" content="Ethereum unit converter tools can help to ensure that users are using the correct units when interacting with the Ethereum network." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div className="offset-4 col-4">
                    <Fieldset legend="Unit converter">
                        <section>
                            <UnitConverter />
                        </section>
                    </Fieldset>
                </div>
            </div>
        </>
    );
}

export default UnitConvert;
