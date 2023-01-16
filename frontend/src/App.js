import "./App.scss";
import React, { useEffect, useState, useRef } from "react";
//import Tooltip from '@mui/material/Tooltip';
import { BiError } from "react-icons/bi";
import io from "socket.io-client";
import Tooltip from "./components/Tooltip";
import { AiFillCheckCircle } from "react-icons/ai";
import clsx from "clsx";
import { v4 as uuidv4 } from "uuid";
import { SiAirtable } from "react-icons/si";
import { BiMessageError } from "react-icons/bi";
import axios from "axios";
import { FaFileCsv } from "react-icons/fa";
import { FaLink } from "react-icons/fa";

var SERVER_HOST = "";

const socket = io(SERVER_HOST);

function App() {
  const JoinRoom = (roomCode) => {
    socket.emit("join_room", { roomCode });
  };

  function ReverseArr(input) {
    var ret = new Array();
    for (var i = input.length - 1; i >= 0; i--) {
      ret.push(input[i]);
    }
    return ret;
  }
  //receive socket messages
  const [fetchingMessage, setFetchingMessage] = useState(null);
  const [downloadingMessage, setDownloadingMessage] = useState(null);
  const [csvGeneratingMessage, setCsvGeneratingMessage] = useState(null);
  const [soundLinksMessage, setSoundLinksMessage] = useState(null);
  useEffect(() => {
    //recieve messages
    var pastMessage1;
    socket.on("scrapingUpdate", (data) => {
      if (pastMessage1 !== data) {
        //  console.log('someone sent a message')
        // console.log(data)
        setFetchingMessage(data);
        pastMessage1 = data;
      }
    });

    var pastMessage2;
    socket.on("downloadingUpdate", (data) => {
      if (pastMessage2 !== data) {
        //   console.log('someone sent a message')
        //   console.log(data)
        setDownloadingMessage(data);
        pastMessage2 = data;
      }
    });

    var pastMessage3;
    socket.on("csvGeneratingUpdate", (data) => {
      if (pastMessage3 !== data) {
        console.log("someone sent a message");
        console.log(data);
        setCsvGeneratingMessage(data);
        pastMessage3 = data;
      }
    });

    var pastMessage4;
    socket.on("soundLinksUpdate", (data) => {
      if (pastMessage4 !== data) {
        console.log("someone sent a message");
        console.log(data);
        setSoundLinksMessage(data);
        pastMessage4 = data;
      }
    });
  }, [socket]);

  //input
  const [username, setUsername] = useState("");

  //loading
  const [loadingAccountVideos, setLoadingAccountVideos] = useState(false);
  const [loadingDownloadVideos, setLoadingDownloadVideos] = useState(false);
  const [loadingSendingToAirtable, setLoadingSendingToAirtable] =
    useState(false);
  //results
  /*const [accountVideos, setAccountVideos] = useState([
    'https://www.tiktok.com/@tunisian_series3/video/7160405297272507653',
    'https://www.tiktok.com/@tunisian_series3/video/7160362907492961541',
    'https://www.tiktok.com/@tunisian_series3/video/7160077387735043334',
  ]);*/
  const [accountVideos, setAccountVideos] = useState(null);

  const [downloadLink, setDownloadedLink] = useState(null);

  //send username to backend, route to /scrape/:username
  const [
    fetchingAccountVideosErrorMessage,
    setFetchingAccountVideosErrorMessage,
  ] = useState("");

  const GetAccountVideos = async () => {
    //reset past results
    setAccountVideos(null);
    setDownloadedLink(null);
    setVideosSavedToAirtable(null);
    setBatchOrder(0);
    setSplittedLinks(null);
    setNumberOfVideosDownloadedForEachBatch([]);
    setAirtableScrapingHistoryVideo(null);
    setAirtableScrapingHistoryVideoIndex(null);
    setCsvDownloadLink(null);
    //reset errors
    setFetchingAccountVideosErrorMessage("");

    setLoadingAccountVideos(true);

    //join socket room
    JoinRoom(username);

    try {
      const response = await fetch(`${SERVER_HOST}/scrape/${username}`, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE,PATCH,OPTIONS",
        },
      });
      const data = await response.json();
      if (data?.links) {
        setAccountVideos(ReverseArr(data?.links));
      }
      console.log(
        " LAST DOWNLOADED VIDEO FROM PROFILE : " +
          data?.lastDownloadedVideoFromSameProfile
      );

      if (data?.error) {
        setFetchingAccountVideosErrorMessage(data?.error);
      }

      setLoadingAccountVideos(false);
    } catch (error) {
      setFetchingAccountVideosErrorMessage(error.message);
      setLoadingAccountVideos(false);
    } finally {
      setLoadingAccountVideos(false);
    }
  };

  //SPLIT account videos to batches of 10s
  const [splittedLinks, setSplittedLinks] = useState(null);

  useEffect(() => {
    if (accountVideos?.length > 0) {
      const splittedLinks = [];
      for (let i = 0; i < accountVideos.length; i += 10) {
        splittedLinks.push(accountVideos.slice(i, i + 10));
      }
      setSplittedLinks(splittedLinks);
    }
  }, [accountVideos]);

  //show tooltip after whenever we get a new message from socket
  const [showFetchingTooltip, setShowFetchingTooltip] = useState(false);
  useEffect(() => {
    if (fetchingMessage) {
      setShowFetchingTooltip(true);
    }
  }, [fetchingMessage]);

  // hide tooltip after  7 seconds
  useEffect(() => {
    if (showFetchingTooltip) {
      setTimeout(() => {
        setShowFetchingTooltip(false);
      }, 7000);
    }
  }, [showFetchingTooltip]);

  const [showDownloadTooltip, setShowDownloadTooltip] = useState(false);
  //show download tool tip whenevr we get a new downloaidng message from socket

  useEffect(() => {
    if (showDownloadTooltip) {
      setTimeout(() => {
        setShowDownloadTooltip(false);
      }, 10000);
    }
  }, [showDownloadTooltip]);

  useEffect(() => {
    if (downloadingMessage) {
      setShowDownloadTooltip(true);
    }
  }, [downloadingMessage]);

  //FOLDER NAME
  const [folderName, setFolderName] = useState();
  useEffect(() => {
    setFolderName(uuidv4());
  }, []);

  //DOWNLOAD VIDEOS ON SERVER FROM LINKS
  const [
    fetchingDownloadLinkErrorMessage,
    setFetchingDownloadLinkErrorMessage,
  ] = useState("");
  const [batchOrder, setBatchOrder] = useState(0);
  const [
    numberOfVideosDownloadedForEachBatch,
    setNumberOfVideosDownloadedForEachBatch,
  ] = useState([]);

  const DownloadVideosOnServer = async (batch, batchOrder, folderName) => {
    try {
      const response = await fetch(`${SERVER_HOST}/download`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          links: batch,
          folderName: folderName,
          batchOrder: batchOrder,
          numberOfBatches: splittedLinks.length,
        }),
      });
      const data = await response.json();

      setBatchOrder(data?.batchOrder);
      console.log("we received batch order", data?.batchOrder);
      setNumberOfVideosDownloadedForEachBatch((prevValue) => [
        ...prevValue,
        data?.videosCount,
      ]);
      //check if the received batch order is the last batch
      if (data?.batchOrder + 1 > splittedLinks.length) {
        //setDownloadedLink(SERVER_HOST + '/download/' + data?.folderName);
        setDownloadedLink("DONE ! ");

        setLoadingDownloadVideos(false);
        console.log("WE REACHED LAST BATCH");
        //else repeat and download the next batcha
      } else {
        DownloadVideosOnServer(
          splittedLinks[data?.batchOrder],
          data?.batchOrder,
          data?.folderName
        );
        console.log("WE MOVED TO NEXT BATCH");
      }
    } catch (error) {
      setFetchingDownloadLinkErrorMessage(error.message);
      setLoadingDownloadVideos(false);
    }
  };

  const GetDownloadLink = () => {
    var newFolderName = uuidv4();
    setFolderName(newFolderName);

    JoinRoom(username);
    //reset
    setBatchOrder(0);
    setLoadingDownloadVideos(true);
    setFetchingDownloadLinkErrorMessage("");
    setNumberOfVideosDownloadedForEachBatch([]);
    //download first batch, and when we finish  increase number of downloaded videos, then download next batch etc
    DownloadVideosOnServer(splittedLinks[0], 0, newFolderName);
  };

  //console.log('DOWNLOADING BATCH ' + (batchOrder + 1) + ' OF ' + splittedLinks?.length);

  //AIRTABLE
  const [airtableErrorMessage, setAirtableErrorMessage] = useState("");
  const [videosSavedToAirtable, setVideosSavedToAirtable] = useState(null);

  const SaveDataToAirtable = async (
    username,
    downloadLink,
    lastDownloadedVideos,
    csvDownloadLink
  ) => {
    JoinRoom(username);

    var numberOfVideos = 0;
    //count numbers in array numberofvidezosineachbatch
    numberOfVideosDownloadedForEachBatch.forEach((batch) => {
      numberOfVideos += batch;
    });

    //reset
    setLoadingSendingToAirtable(true);
    setAirtableErrorMessage("");
    setVideosSavedToAirtable(null);

    //save username + link + number of videos + last downloaded videos to airtable using route /save
    try {
      const response = await fetch(`${SERVER_HOST}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          downloadLink: downloadLink,
          numberOfVideos: numberOfVideos,
          lastDownloadedVideos: lastDownloadedVideos,
          csvDownloadLink: csvDownloadLink,
        }),
      });
      const data = await response.json();
      if (data?.error) {
        setAirtableErrorMessage(data?.error);
      }
      setVideosSavedToAirtable(data?.records);

      setLoadingSendingToAirtable(false);
    } catch (error) {
      setAirtableErrorMessage(error.message);
      setLoadingSendingToAirtable(false);
    }
  };

  const [
    airtableScrapingHistoryVideoIndex,
    setAirtableScrapingHistoryVideoIndex,
  ] = useState(null);
  console.log(
    "airtableScrapingHistoryVideoIndex " + airtableScrapingHistoryVideoIndex
  );

  const [airtableScrapingHistoryVideo, setAirtableScrapingHistoryVideo] =
    useState(null);
  const [
    loadingCheckingProfileScrapeHistory,
    setLoadingCheckingProfileScrapeHistory,
  ] = useState(false);
  console.log(airtableScrapingHistoryVideo);

  const GetPastVideosOfProfile = async (username) => {
    setLoadingCheckingProfileScrapeHistory(true);
    setAirtableScrapingHistoryVideo(null);
    setAirtableScrapingHistoryVideoIndex(null);
    setAlreadyScrapedVideosRemoved(false);

    fetch(`${SERVER_HOST}/check/${username}`)
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        //if res.records[0].fields['Last Downloaded Videos '] has a \n in the end, remove it

        //if it exists, setAirtableScrapingHistoryVideo to it
        var pastVideo = res?.row;
        var index = accountVideos?.findIndex((video) => video == pastVideo);

        if (index > -1) {
          setAirtableScrapingHistoryVideo(pastVideo);
          setAirtableScrapingHistoryVideoIndex(index);
          console.log("ONE OF THE ACCOUNT VIDEOS HAS BEEN SCRAPED IN THE PAST");
        } else {
          console.log("this profile has not been scraped before");
        }

        console.log(res.records[0].fields["Last Downloaded Videos "]);

        setLoadingCheckingProfileScrapeHistory(false);
      })

      .catch((error) => {
        console.log(error);

        setLoadingCheckingProfileScrapeHistory(false);
      });
  };
  //CHECK PROFILE SCRAPING HISTORY
  useEffect(() => {
    if (!accountVideos || alreadyScrapedVideosRemoved) return;
    GetPastVideosOfProfile(username);
  }, [accountVideos]);

  const [alreadyScrapedVideosRemoved, setAlreadyScrapedVideosRemoved] =
    useState(false);

  function RemoveAllAlreadyScrapedVideos() {
    //loop through accoutn videos and filter videos that meet this condition : (video==airtableScrapingHistoryVideo || (airtableScrapingHistoryVideoIndex && (airtableScrapingHistoryVideoIndex!=-1) && (index < airtableScrapingHistoryVideoIndex))
    var filteredVideos = accountVideos?.filter((video, index) => {
      return !(
        airtableScrapingHistoryVideoIndex == 0 ||
        video == airtableScrapingHistoryVideo ||
        (airtableScrapingHistoryVideoIndex &&
          airtableScrapingHistoryVideoIndex != -1 &&
          index < airtableScrapingHistoryVideoIndex)
      );
    });
    setAlreadyScrapedVideosRemoved(true);
    setAccountVideos(filteredVideos);
  }

  //GET SOUND LINKS
  const [soundLinks, setSoundLinks] = useState(null);
  const [loadingSoundLinks, setLoadingSoundLinks] = useState(false);

  const GetSoundLinks = async () => {
    JoinRoom(username);
    setLoadingSoundLinks(true);
    setSoundLinks(null);

    fetch(`${SERVER_HOST}/music`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ links: accountVideos, folderName: folderName }),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        setSoundLinks(res?.musicData);
        setLoadingSoundLinks(false);
      })
      .catch((error) => {
        console.log(error);
        setLoadingSoundLinks(false);
      });
  };
  //GENERATE CSV FILE (requires getting sound for each vidoe)
  const [loadingGenerateCsv, setLoadingGenerateCsv] = useState(false);
  const [csvDownloadLink, setCsvDownloadLink] = useState(null);
  function GenerateCsv() {
    JoinRoom(username);
    setLoadingGenerateCsv(true);
    //post request to /music route to server
    fetch(`${SERVER_HOST}/spreadsheet`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        musicData: soundLinks,
        folderName: folderName,
        username: username,
      }),
    })
      .then((res) => res.json())
      .then((res) => {
        console.log(res);
        setCsvDownloadLink(res.csvDownloadLink);
        setLoadingGenerateCsv(false);
      })
      .catch((error) => {
        console.log(error);
        setLoadingGenerateCsv(false);
      });
  }

  //show csv tooltip after whenever we get a new message from socket
  const [showCsvTooltip, setShowCsvTooltip] = useState(false);
  useEffect(() => {
    if (csvGeneratingMessage) {
      setShowCsvTooltip(true);
    }
  }, [csvGeneratingMessage]);

  // hide csv tooltip after  7 seconds
  useEffect(() => {
    if (showCsvTooltip) {
      setTimeout(() => {
        setShowCsvTooltip(false);
      }, 7000);
    }
  }, [showCsvTooltip]);

  //show sound links tooltip after whenever we get a new message from socket
  const [showSoundsTooltip, setShowSoundsTooltip] = useState(false);
  useEffect(() => {
    if (soundLinksMessage) {
      setShowSoundsTooltip(true);
    }
  }, [soundLinksMessage]);

  // hide csv tooltip after  7 seconds
  useEffect(() => {
    if (showSoundsTooltip) {
      setTimeout(() => {
        setShowSoundsTooltip(false);
      }, 7000);
    }
  }, [showSoundsTooltip]);

  return (
    <div
      className="App"
      style={{ paddingTop: "100px", paddingBottom: "350px" }}
    >
      <div style={{ width: "90%", maxWidth: "500px", margin: "auto" }}>
        <h1
          style={{ textAlign: "left" }}
          className="text-3xl mb-4 font-semibold"
        >
          TikTok Account Videos Downloader
        </h1>
        <h3
          style={{
            marginTop: "-10px",
            opacity: "0.9",
            fontWeight: "200",
            textAlign: "left",
          }}
          className="text-lg"
        >
          Please enter the Account Username below
        </h3>

        <div
          style={{ display: "flex", alignItems: "center", marginTop: "40px" }}
        >
          <p style={{ opacity: "0.5", fontSize: "20px", marginRight: "7px" }}>
            @
          </p>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            data-e2e="common-StringInput-TUXTextInput"
            className="css-5g0doo eyio37s1 snipcss-woI25"
          />
        </div>

        {/* <Tooltip tooltip="yooooooo" show={true} >
          <h3>YOOOO</h3>

        </Tooltip> */}
        <button
          type="button"
          style={{
            opacity:
              (loadingAccountVideos ||
                loadingDownloadVideos ||
                loadingSendingToAirtable ||
                loadingGenerateCsv) &&
              "0.5",
            pointerEvents:
              (loadingAccountVideos ||
                loadingDownloadVideos ||
                loadingSendingToAirtable ||
                loadingGenerateCsv) &&
              "none",
          }}
          onClick={() => {
            GetAccountVideos();
          }}
          className="inline-block mt-9 px-7 py-3 bg-rose-500 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-rose-600 hover:shadow-lg  focus:shadow-lg focus:outline-none focus:ring-0  focus:shadow-lg transition duration-150 ease-in-out "
        >
          Start
        </button>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            margin: "auto",
            width: "fit-content",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: accountVideos || loadingAccountVideos ? "1" : "0.5",
            }}
          >
            <Tooltip show={showFetchingTooltip} tooltip={fetchingMessage}>
              <div
                className="StepsNumber"
                data-tooltip-target="fetching-tooltip"
                style={{ backgroundColor: accountVideos && "limegreen" }}
              >
                1
              </div>
            </Tooltip>

            <p className="StepsLabel">
              Fetching Account Videos &nbsp;
              {accountVideos && <b>({accountVideos?.length} video)</b>}
            </p>

            <div
              className="lds-ripple"
              style={{ opacity: loadingAccountVideos ? "1" : "0" }}
            >
              <div></div>
              <div></div>
            </div>
          </div>
          <div
            className="FirstStepContent"
            style={{
              borderLeft: "1px solid lightgrey",
              paddingLeft: "30px",
              marginLeft: "20px",
            }}
          >
            {fetchingAccountVideosErrorMessage && (
              <div style={{ color: "red", fontWeight: "400" }}>
                <BiError /> {fetchingAccountVideosErrorMessage}
              </div>
            )}

            {accountVideos && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  height: "250px",
                  overflowY: "scroll",
                  width: "fit-content",
                  maxWidth: "500px",
                  margin: "auto",
                }}
                className=" bg-slate-100"
              >
                {accountVideos.map((video, index) => {
                  //find index of airtableScrapingHistoryVideo in accountVideos

                  return (
                    <div>
                      {" "}
                      {!(
                        !alreadyScrapedVideosRemoved &&
                        (airtableScrapingHistoryVideoIndex == 0 ||
                          airtableScrapingHistoryVideoIndex ==
                            accountVideos?.length - 1 ||
                          video == airtableScrapingHistoryVideo ||
                          (airtableScrapingHistoryVideoIndex &&
                            airtableScrapingHistoryVideoIndex != -1 &&
                            index < airtableScrapingHistoryVideoIndex))
                      ) && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: "10px",
                          }}
                        >
                          <a
                            href={video}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              fontSize: "10.5px",
                              color:
                                !alreadyScrapedVideosRemoved &&
                                (airtableScrapingHistoryVideoIndex == 0 ||
                                  airtableScrapingHistoryVideoIndex ==
                                    accountVideos?.length - 1 ||
                                  video == airtableScrapingHistoryVideo ||
                                  (airtableScrapingHistoryVideoIndex &&
                                    airtableScrapingHistoryVideoIndex != -1 &&
                                    index < airtableScrapingHistoryVideoIndex))
                                  ? "red"
                                  : "#0072E5",
                              textDecoration: "none",
                              marginLeft: "10px",
                            }}
                          >
                            {video}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}

                {accountVideos.map((video, index) => {
                  //find index of airtableScrapingHistoryVideo in accountVideos

                  return (
                    <div>
                      {" "}
                      {!alreadyScrapedVideosRemoved &&
                        (airtableScrapingHistoryVideoIndex == 0 ||
                          airtableScrapingHistoryVideoIndex ==
                            accountVideos?.length - 1 ||
                          video == airtableScrapingHistoryVideo ||
                          (airtableScrapingHistoryVideoIndex &&
                            airtableScrapingHistoryVideoIndex != -1 &&
                            index < airtableScrapingHistoryVideoIndex)) && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              marginTop: "10px",
                            }}
                          >
                            <a
                              href={video}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                fontSize: "10.5px",
                                color:
                                  !alreadyScrapedVideosRemoved &&
                                  (airtableScrapingHistoryVideoIndex == 0 ||
                                    airtableScrapingHistoryVideoIndex ==
                                      accountVideos?.length - 1 ||
                                    video == airtableScrapingHistoryVideo ||
                                    (airtableScrapingHistoryVideoIndex &&
                                      airtableScrapingHistoryVideoIndex != -1 &&
                                      index <
                                        airtableScrapingHistoryVideoIndex))
                                    ? "red"
                                    : "#0072E5",
                                textDecoration: "none",
                                marginLeft: "10px",
                              }}
                            >
                              {video}
                            </a>
                          </div>
                        )}
                    </div>
                  );
                })}
              </div>
            )}
            {/* <button onClick={() => { GetPastVideosOfProfile(username) }}>CHECK PAST {airtableScrapingHistoryVideoIndex} - {accountVideos?.length} </button>  */}
            {loadingCheckingProfileScrapeHistory && (
              <div>
                <span className="text-red-700 text-sm ">
                  Checking Profile Scraping History...
                </span>
                <div
                  className="lds-ripple"
                  style={{
                    opacity: loadingCheckingProfileScrapeHistory ? "1" : "0",
                    marginBottom: "-35px",
                  }}
                >
                  <div></div>
                  <div></div>
                </div>
              </div>
            )}
            {airtableScrapingHistoryVideo && !alreadyScrapedVideosRemoved && (
              <div className="text-sm text-gray-700 mt-12">
                You scraped this profile in the past !
                <div
                  onClick={() => {
                    RemoveAllAlreadyScrapedVideos();
                  }}
                  className="text-red-600 cursor-pointer hover:text-red-800  transition duration-300 ease-in-out py-1 px-1  	 "
                >
                  click here to remove already scraped videos
                </div>
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: accountVideos ? "1" : "0.5",
            }}
          >
            <Tooltip show={showDownloadTooltip} tooltip={downloadingMessage}>
              <div
                className="StepsNumber"
                style={{ backgroundColor: downloadLink && "limegreen" }}
              >
                2
              </div>
            </Tooltip>
            <p className="StepsLabel">Downloading Videos</p>
            <div
              className="lds-ripple"
              style={{
                opacity: accountVideos && loadingDownloadVideos ? "1" : "0",
              }}
            >
              <div></div>
              <div></div>
            </div>
          </div>

          <div
            className="SecondStepContent"
            style={{
              borderLeft: "1px solid lightgrey",
              paddingLeft: "30px",
              marginLeft: "20px",
            }}
          >
            {accountVideos && (
              <button
                type="button"
                style={{
                  opacity:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv) &&
                    "0.5",
                  pointerEvents:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv) &&
                    "none",
                }}
                onClick={() => {
                  GetDownloadLink();
                }}
                className={clsx(
                  "flex items-center px-7 py-4 bg-rose-500 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-rose-600 hover:shadow-lg  focus:shadow-lg focus:outline-none focus:ring-0  focus:shadow-lg transition duration-150 ease-in-out ",
                  downloadLink && "bg-green-500 hover:bg-green-600"
                )}
              >
                <div> Get Download Link {downloadLink && "again"}</div>{" "}
                <FaLink style={{ marginLeft: "10px" }} />
              </button>
            )}

            {splittedLinks && (
              <div className="w-full">
                <p className="text-sm text-gray-500 my-4">
                  Links were splitted in batches of 10 to avoid issues with the
                  server
                </p>

                {splittedLinks.map((batch, index) => {
                  return (
                    <div className="text-green-500 mt-0 mb-4 hover:text-green-600 text-sm transition duration-300 ease-in-out mb-4 bg:black py-2 px-4 bg-slate-100 rounded-md w-full flex	 ">
                      <p
                        className={clsx(
                          "ml-2 text-rose-400 font-sm text-left  font-normal",
                          (batchOrder > index ||
                            batchOrder == splittedLinks?.length) &&
                            "text-green-600"
                        )}
                      >
                        Batch {index + 1} (<b>{batch?.length} videos</b>)
                      </p>
                      {(batchOrder > index ||
                        batchOrder == splittedLinks?.length) && (
                        <p className="ml-2 text-green-400 font-sm text-right  text-md">
                          <AiFillCheckCircle
                            style={{ marginLeft: "3px", marginTop: "3px" }}
                          />
                        </p>
                      )}
                      {batchOrder == index && loadingDownloadVideos && (
                        <p className="ml-2 text-blue-400 font-sm text-right  text-sm">
                          Downloading...
                        </p>
                      )}
                      {numberOfVideosDownloadedForEachBatch[index] &&
                        numberOfVideosDownloadedForEachBatch[index] !==
                          splittedLinks[index]?.length && (
                          <p className="ml-2 text-gray-500 font-sm text-right  text-xs mt-0.5">
                            {numberOfVideosDownloadedForEachBatch[index]} Videos
                            Successfully Downloaded
                          </p>
                        )}

                      {/* {batch.map((link)=>{
                      return(
                        <a href={link} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#0072E5', textDecoration: 'none', marginLeft: '10px' }} >{link}</a>
                        )})} */}
                    </div>
                  );
                })}
              </div>
            )}

            {downloadLink && (
              <a
                href={downloadLink}
                target="_blank"
                className="text-green-500 mt-0 mb-8 hover:text-green-600 text-sm transition duration-300 ease-in-out mb-4 bg:black py-2 px-4 bg-slate-100 rounded-md w-full flex items-center	 "
              >
                <AiFillCheckCircle
                  style={{ marginLeft: "-10px", paddingRight: "10px" }}
                />{" "}
                <div>{downloadLink}</div>{" "}
              </a>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: downloadLink ? "1" : "0.5",
            }}
          >
            <Tooltip show={showSoundsTooltip} tooltip={soundLinksMessage}>
              <div
                className="StepsNumber"
                style={{ backgroundColor: soundLinks && "limegreen" }}
              >
                3
              </div>
            </Tooltip>
            <p className="StepsLabel">Get Sound Links</p>
            <div
              className="lds-ripple"
              style={{ opacity: loadingSoundLinks ? "1" : "0" }}
            >
              <div></div>
              <div></div>
            </div>
          </div>

          <div
            className="ThirdStepContent"
            style={{
              borderLeft: "1px solid lightgrey",
              paddingLeft: "30px",
              marginLeft: "20px",
            }}
          >
            {downloadLink && (
              <button
                type="button"
                style={{
                  opacity:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv ||
                      loadingSoundLinks) &&
                    "0.5",
                  pointerEvents:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv) &&
                    "none",
                }}
                onClick={() => {
                  GetSoundLinks();
                }}
                className={clsx(
                  "flex items-center px-7 py-4 bg-rose-500 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-rose-600 hover:shadow-lg  focus:shadow-lg focus:outline-none focus:ring-0  focus:shadow-lg transition duration-150 ease-in-out ",
                  soundLinks && "bg-green-500 hover:bg-green-600"
                )}
              >
                <div> Get Sound Links {soundLinks && "again"}</div>{" "}
                <FaLink style={{ marginLeft: "10px" }} />
              </button>
            )}

            {downloadLink && (
              <p className="text-sm text-gray-500 my-4 text-left">
                {" "}
                we need to scrape each video's page for the sound link{" "}
              </p>
            )}

            {soundLinks && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  height: "250px",
                  overflowY: "scroll",
                  width: "fit-content",
                  maxWidth: "500px",
                  margin: "auto",
                }}
                className=" bg-slate-100"
              >
                {soundLinks.map((link, index) => {
                  //find index of airtableScrapingHistoryVideo in accountVideos

                  return (
                    <div key={index}>
                      {" "}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginTop: "10px",
                        }}
                      >
                        <a
                          href={link?.musicLink}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            fontSize: "10.5px",
                            color: "#0072E5",
                            textDecoration: "none",
                            marginLeft: "10px",
                            textAlign: "left",
                          }}
                        >
                          {link?.musicLink}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: soundLinks ? "1" : "0.5",
            }}
          >
            <Tooltip show={showCsvTooltip} tooltip={csvGeneratingMessage}>
              <div
                className="StepsNumber"
                style={{ backgroundColor: csvDownloadLink && "limegreen" }}
              >
                4
              </div>
            </Tooltip>
            <p className="StepsLabel">Save to Spreadsheet</p>
            <div
              className="lds-ripple"
              style={{ opacity: loadingGenerateCsv ? "1" : "0" }}
            >
              <div></div>
              <div></div>
            </div>
          </div>

          <div
            className="FourthStepContent"
            style={{
              borderLeft: "1px solid lightgrey",
              paddingLeft: "30px",
              marginLeft: "20px",
            }}
          >
            {soundLinks && (
              <button
                type="button"
                style={{
                  opacity:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv) &&
                    "0.5",
                  pointerEvents:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv) &&
                    "none",
                }}
                onClick={() => {
                  GenerateCsv();
                }}
                className={clsx(
                  "flex items-center px-7 py-4 bg-rose-500 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-rose-600 hover:shadow-lg  focus:shadow-lg focus:outline-none focus:ring-0  focus:shadow-lg transition duration-150 ease-in-out ",
                  csvDownloadLink && "bg-green-500 hover:bg-green-600"
                )}
              >
                <div>
                  {" "}
                  {airtableScrapingHistoryVideo && "Update Spreadsheet"}{" "}
                  {!airtableScrapingHistoryVideo && "Create Sheet && Update"}{" "}
                  {csvDownloadLink && " again"}
                </div>{" "}
                <FaFileCsv style={{ marginLeft: "10px" }} />
              </button>
            )}

            {soundLinks && (
              <p className="text-sm text-gray-500 my-4 text-left">
                Spreadsheet contains data for each video, like the download link
                and video sound link{" "}
              </p>
            )}

            {csvDownloadLink && (
              <a
                target="_blank"
                href={csvDownloadLink}
                className="text-green-500 mt-0 mb-8 hover:text-green-600 text-sm transition duration-300 ease-in-out mb-4 bg:black py-2 px-4 bg-slate-100 rounded-md w-full flex items-center	 "
              >
                <AiFillCheckCircle
                  style={{ marginLeft: "-10px", paddingRight: "10px" }}
                />{" "}
                <div>{csvDownloadLink}</div>{" "}
              </a>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: csvDownloadLink ? "1" : "0.5",
            }}
          >
            <div
              className="StepsNumber"
              style={{ backgroundColor: videosSavedToAirtable && "limegreen" }}
            >
              5
            </div>
            <p className="StepsLabel">Sending Videos to Airtable</p>
            <div
              className="lds-ripple"
              style={{ opacity: loadingSendingToAirtable ? "1" : "0" }}
            >
              <div></div>
              <div></div>
            </div>
          </div>
          <div
            className="SixthStepContent"
            style={{
              borderLeft: "1px solid lightgrey",
              paddingLeft: "30px",
              marginLeft: "20px",
            }}
          >
            {csvDownloadLink && (
              <button
                type="button"
                style={{
                  opacity:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv ||
                      airtableScrapingHistoryVideo) &&
                    "0.5",
                  pointerEvents:
                    (loadingAccountVideos ||
                      loadingDownloadVideos ||
                      loadingSendingToAirtable ||
                      loadingGenerateCsv ||
                      airtableScrapingHistoryVideo) &&
                    "none",
                }}
                onClick={() => {
                  SaveDataToAirtable(
                    username,
                    downloadLink,
                    accountVideos[0],
                    csvDownloadLink
                  );
                }}
                className={clsx(
                  "flex mb-4 items-center px-7 py-4 bg-rose-500 text-white font-medium text-sm leading-snug uppercase rounded shadow-md hover:bg-rose-600 hover:shadow-lg  focus:shadow-lg focus:outline-none focus:ring-0  focus:shadow-lg transition duration-150 ease-in-out ",
                  (videosSavedToAirtable || airtableScrapingHistoryVideo) &&
                    "bg-green-500 hover:bg-green-600"
                )}
              >
                <div> Send to Airtable {videosSavedToAirtable && "again"} </div>{" "}
                <SiAirtable style={{ marginLeft: "10px" }} />
              </button>
            )}
            {csvDownloadLink && airtableScrapingHistoryVideo && (
              <p className="text-sm  text-left text-pink-500 my-4">
                Profile is already on Airtable !
              </p>
            )}

            {videosSavedToAirtable && (
              <div className="w-full">
                {videosSavedToAirtable.map((record, index) => {
                  return (
                    <div className="text-green-500 mt-0 mb-4 hover:text-green-600 text-sm transition duration-300 ease-in-out mb-4 bg:black py-2 px-4 bg-slate-100 rounded-md w-full flex	 ">
                      <p
                        className={clsx(
                          "ml-2  font-sm text-left  font-normal text-green-600"
                        )}
                      >
                        {" "}
                        Record ID <b> {record.id}</b> Saved to{" "}
                        <b> {record.tableName}</b>{" "}
                      </p>
                      {
                        <p className="ml-2 text-green-400 font-sm text-right  text-md">
                          <AiFillCheckCircle
                            style={{ marginLeft: "3px", marginTop: "3px" }}
                          />
                        </p>
                      }
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
