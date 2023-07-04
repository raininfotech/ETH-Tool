import InputDecoder from "ethereum-input-data-decoder";
import { Helmet } from "react-helmet";
import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BASE_URL } from "./Config";

function TextInput(props: any = {}) {
    const [value, setValue] = useState("");
    const handleChange = (event: any) => {
        const val = event.target.value;
        setValue(val);
        if (props.onChange) {
            props.onChange(val);
        }
    };
    useEffect(() => {
        setValue(props.value);
    }, [props.value]);
    let el: any;
    if (props.variant === "textarea") {
        el = <textarea readOnly={props.readOnly} disabled={props.disabled} placeholder={props.placeholder} value={value || ""} onChange={handleChange} style={{ height: "70vh" }} />;
    } else {
        el = <input readOnly={props.readOnly} disabled={props.disabled} placeholder={props.placeholder} type="text" value={value || ""} onChange={handleChange} style={{ height: "70vh" }} />;
    }
    return el;
}
function Decoder() {
    let location = useLocation();
    const [abi, setAbi] = useState("");
    const handleChange = (event: any) => {
        const val = event.target.value;
        setAbi(val);
    };

    const [inputData, setInputData] = useState(localStorage.getItem("decodeInputData") || "");
    const [result, setResult] = useState<any>(null);
    useEffect(() => {
        localStorage.setItem("decodeInputData", inputData || "");
    }, [inputData]);
    const decode = () => {
        if (!(abi && abi.length)) {
            throw new Error("abi required");
        }
        const decoder = new InputDecoder(abi);
        const decoded = decoder.decodeData(inputData);
        setResult(decoded);
    };
    const handleSubmit = (event: any) => {
        event.preventDefault();
        try {
            decode();
        } catch (err) {
            alert(err.message);
        }
    };
    const handleInputDataChange = (value: string) => {
        setInputData(value);
    };

    return (
        <>
            <Helmet>
                <title>Decode Ethereum transaction Tools</title>
                <meta name="description" content="The best decoding tools can decode Ethereum transaction data, analyse smart contract calls using ABI." />
                <meta property="og:title" content="Decode Ethereum transaction Tools" />
                <meta property="og:description" content="The best decoding tools can decode Ethereum transaction data, analyse smart contract calls using ABI." />
                <meta property="og:url" content={`${BASE_URL}${location.pathname}`} />
                <link rel="canonical" href={`${BASE_URL}${location.pathname}`} />
            </Helmet>
            <div className="row">
                <div>
                    <form onSubmit={handleSubmit}>
                        <div className="row">
                            <div className="col-4">
                                <div style={{ marginTop: "0.5rem" }}>
                                    <label>ABI</label>
                                    <textarea value={abi} onChange={handleChange} placeholder="0x" style={{ height: "70vh" }} />
                                </div>
                            </div>
                            <div className="col-4">
                                <div style={{ marginTop: "0.5rem" }}>
                                    <label>Input data (hex)</label>
                                    <TextInput value={inputData} onChange={handleInputDataChange} placeholder="0x" variant="textarea" />
                                </div>
                            </div>
                            <div className="col-4">
                                <div style={{ marginTop: "0.5rem" }}>
                                    <label>Output</label>
                                    <textarea value={result ? JSON.stringify(result, null, 2) : ""} placeholder="0x" readOnly style={{ height: "70vh" }} />
                                    {/* <pre>{result ? JSON.stringify(result, null, 2) : ""}</pre> */}
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
export default Decoder;
