import { useState, useEffect } from "react";
import { Web3Storage } from "web3.storage";
import toast, { Toaster } from "react-hot-toast";
import { ethers } from "ethers";
import { videoPlatformAddress } from "../Config/Config";
const videoABI = require("../ABI/videoPlatformABI.json");

export default function Form() {
  const [name, setName] = useState("");
  const [fileState, setFile] = useState([]);
  const [metadataIPFS, setMetadataIPFS] = useState("");
  const [provider, setProvider] = useState({});
  const [videos, setVideos] = useState([]);
  const [hash, setHash] = useState(null);
  const [newVid, setNewVid] = useState(false);


  useEffect(() => {
    if (
      typeof window.ethereum !== "undefined"
    ) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      setProvider(provider);
    }
  }, []);

  const getCid = async () => {
    // Construct with token and endpoint
    const client = new Web3Storage({
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDRiQmQzZDMzMzgyRjZjNTI0MDRlMTIyN2RDMUQ3MThhMkU2NGNEMDkiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2NzE4Njk3NDUxNzAsIm5hbWUiOiJWaWRQbGF0Zm9ybSJ9.oT3kpjykVBtosuiy65avTpR0Nicy3aDqgkNzthO91Mg",
    });
    try {
      const rootCid = await client.put(fileState, { wrapWithDirectory: false });
      console.log("CID" + rootCid);
      const url = "ipfs://" + rootCid + "/";
      const obj = { name: "Vid", animation_url: url };
      const blob = new Blob([JSON.stringify(obj)], {
        type: "application/json",
      });

      const metadataFile = [new File([blob], "metadata.json")];
      const cid = await client.put(metadataFile, { wrapWithDirectory: false });
      console.log("metadatfile cid " + " " + cid);

      const urlMeta = "ipfs://" + cid + "/";
      return [name, urlMeta];
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleMint = async (name, url) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    let userAddress = signer.getAddress();
    let contract = new ethers.Contract(videoPlatformAddress, videoABI, signer);

    const response = await contract.mint(name, url);
    console.log(response);
    console.log(response.hash);
    setHash(response.hash);

    contract.on("VideoCreated", (videoCount, _caption, _url, address) => {
      console.log(" Address " + address);
      let TokenVideo = _url;
      if (TokenVideo.startsWith("ipfs://")) {
        TokenVideo = `https://w3s.link/ipfs/${TokenVideo.split("ipfs://")[1]}`;
      }
      console.log(" URL " + TokenVideo);
      // videos.unshift(TokenVideo);
      setNewVid(true);
      // router.replace(router.asPath);
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (fileState.length == 0) {
      toast.error("No file uploaded");
    } else {
      let [name, url] = await toast.promise(getCid(), {
        loading: "Uploading Video This can take a moment... ⏳",
        success: "Video Uploaded! 🎉",
        error: "Something went wrong! 😢",
      });

      console.log("url:" + " " + url);

      await toast.promise(handleMint(name, url), {
        loading: "Minting your NFT... ⏳",
        success: "NFT Minted! 🎉",
        error: "Something went wrong! 😢",
      });
    }
  };

  async function loadVids() {
    const provider = new ethers.providers.JsonRpcProvider("https://eth-goerli.g.alchemy.com/v2/LK5riXBIuRJgosOlAvRdtxW0pZXhfTdi");
    let contract = new ethers.Contract(
      videoPlatformAddress,
      videoABI,
      provider
    );

    try {
      // setVideos([]);
      const vids = await contract.getVideos();
      console.log(vids);
      console.log(vids.length);

      if (vids.length > 0 && videos.length == 0) {
        for (let i = vids.length - 1; i >= 0; i--) {
          let url = vids[i].url;
          // console.log(url);

          if (url.startsWith("ipfs://")) {
            url = `https://w3s.link/ipfs/${url.split("ipfs://")[1]}`;
          }
          const TokenMetadata = await fetch(url).then((response) =>
            response.json()
          );
          let TokenVideo = TokenMetadata.animation_url;
          if (TokenVideo.startsWith("ipfs://")) {
            TokenVideo = `https://w3s.link/ipfs/${
              TokenVideo.split("ipfs://")[1]
            }`;
          }
          // console.log(TokenVideo);
          setVideos((videos) => [...videos, TokenVideo]);
        }
      } else if (videos.length > 0) {
        const vids = await contract.getVideos();
        let url = vids[vids.length - 1].url;
        // console.log(url);

        if (url.startsWith("ipfs://")) {
          url = `https://w3s.link/ipfs/${url.split("ipfs://")[1]}`;
        }
        const TokenMetadata = await fetch(url).then((response) =>
          response.json()
        );
        let TokenVideo = TokenMetadata.animation_url;
        if (TokenVideo.startsWith("ipfs://")) {
          TokenVideo = `https://w3s.link/ipfs/${
            TokenVideo.split("ipfs://")[1]
          }`;
        }
        // console.log(TokenVideo);
        setVideos((videos) => [TokenVideo, ...videos]);
      }

      // for(let i = 0; i < vids.length-1; i++){
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    loadVids();
  }, [newVid]);

  return (
    <div className="text-center">
      <Toaster position="top-center" reverseOrder={false} />
      <h1 className="text-center font-bold text-2xl py-4"> Create NFT </h1>
      <span>Name: </span>
      <input
        className="border-[#ffff] bg-gray-400 px-1"
        type="text"
        onChange={(e) => setName(e.target.value)}
        required
      />
      <br />
      <input
        className="py-4"
        type="file"
        accept="video/*"
        onChange={async (e) => {
          const files = e.target.files;
          setFile(files);
        }}
      />
      <br />
      <button
        className="bg-gray-400 border-black px-3 py-1"
        style={{ borderRadius: "10px" }}
        onClick={handleSubmit}
      >
        Submit
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 pt-10">
        {videos.map((data, index) => {
          return (
            <video
              key={index}
              className="p-5"
              controls
              src={data}
              width="100%"
              height="100%"
            />
          );
        })}

        {/* <video controls src={videos} width="100%" height="100%" />
        <video controls src={videos} width="100%" height="100%" />
        <video controls src={videos} width="100%" height="100%" /> */}
      </div>
    </div>
  );
}
