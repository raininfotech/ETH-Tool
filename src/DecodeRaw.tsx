import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";

function DecodeRaw() {
    let location = useLocation();
    const [hex, setHex] = useState("");
    const [result, setResult] = useState({});
    const { Transaction } = require("ethereumjs-tx");
    const util = require("ethereumjs-util");

    // const rawTxHex =
    //     "0xf869808203e882520894d3b1a575c3e9dea5d89aec52efcdc3a861570a09880492e64aa8d0b3608026a04967c0cd9c4ed6546cdd1ff98d565307670477e8ad6eac52fd6a5f0a396bf23ea064b50aa00cf43582359a1a9ee96ea160108735f18429eba93b3d89c060bac320";
    const rawTxHex = hex;

    const handleSubmit = (e) => {
        e.preventDefault();
        try {
            const rawTx = Buffer.from(rawTxHex.slice(2), "hex");
            const tx = new Transaction(rawTx);
            const decodedTx = {
                nonce: parseInt(tx.nonce.toString("hex") || "0", 16),
                gasPrice: parseInt(tx.gasPrice.toString("hex"), 16),
                gasLimit: parseInt(tx.gasLimit.toString("hex"), 16),
                to: "0x" + tx.to.toString("hex"),
                value: parseInt(tx.value.toString("hex") || "0", 16),
                data: tx.data.toString("hex"),
                v: tx.v.toString("hex"),
                r: util.bufferToHex(tx.r),
                s: util.bufferToHex(tx.s),
            };
            setResult(decodedTx);
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <>
            <Helmet>
                <title>Decode rawtx Ethereum transaction Tools</title>
                <meta
                    name="description"
                    content="Decode rawtx Ethereum transaction is a valuable tool that can help you understand and analyze Eth raw transactions. With this, Developers can easily understand the details of a raw transaction."
                />
                <meta property="og:title" content="Decode rawtx Ethereum transaction Tools" />
                <meta
                    property="og:description"
                    content="Decode rawtx Ethereum transaction is a valuable tool that can help you understand and analyze Eth raw transactions. With this, Developers can easily understand the details of a raw transaction."
                />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div>
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-4 offset-2">
                                <div style={{ marginTop: "0.5rem" }}>
                                    <label>HEX</label>
                                    <textarea value={hex} onChange={(e) => setHex(e.target.value)} placeholder="0x" style={{ height: "70vh" }} />
                                </div>
                            </div>

                            <div className="col-4">
                                <div style={{ marginTop: "0.5rem" }}>
                                    <label>Output</label>
                                    <textarea value={result ? JSON.stringify(result, null, 2) : ""} placeholder="0x" readOnly style={{ height: "70vh" }} />
                                </div>
                            </div>
                        </div>
                        <div className="d-flex justify-content-center" style={{ marginTop: "0.5rem" }}>
                            <button className="w-200 my-1 w-200" type="submit">
                                decode
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default DecodeRaw;
