// NetsQrPopup.jsx
import { Component } from "react";
import netsQrInfo from "../../assets/payment/netsQrInfo.png";
import txnLoading from "../../assets/payment/progressSpinner.gif";
import netsQrLogo from "../../assets/payment/netsQrLogo.png";
import successIcon from "../../assets/payment/greenTick.png";
import failIcon from "../../assets/payment/redCross.png";
import api from "../../lib/api"
import axios from "axios";

const NETS_TIMEOUT_SECONDS = 300;



class NetsQrPopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      convertTime: { m: 5, s: "00" },
      secondsNetsTimeout: NETS_TIMEOUT_SECONDS, // 5 minutes
      amount: props.amount || "3",
      txnId:
        props.txnId || "sandbox_nets|m|8ff8e5b6-d43e-4786-8ac5-7accf8c5bd9b",
      mobile: props.mobile || 0,
      netsQrPayment: txnLoading,
      netsQrRetrievalRef: "",
      netsQrGenerate: false,
      netsQrResponseCode: "",
      openApiPaasTxnStatus: 0,
      networkCode: "",
      instruction: "",
      errorMsg: "",
      status: "pending", // "pending" | "success" | "fail"
    };

    this.netsTimer = 0;
    this.isApiCalled = false;

    this.queryNets = this.queryNets.bind(this);
    this.startNetsTimer = this.startNetsTimer.bind(this);
    this.decrementNetsTimer = this.decrementNetsTimer.bind(this);
    this.handleNetsReq = this.handleNetsReq.bind(this);
    this.handleNetsCancel = this.handleNetsCancel.bind(this);
    this.handleClosePopup = this.handleClosePopup.bind(this);
    this.resetInternalState = this.resetInternalState.bind(this);
  }

  componentDidMount() {
    // Only auto-start if popup is initially open
    if (this.props.isOpen && !this.isApiCalled) {
      this.handleNetsReq();
    }
  }

  componentDidUpdate(prevProps) {
    // When popup transitions from closed → open, reset + regenerate QR
    if (!prevProps.isOpen && this.props.isOpen) {
      this.resetInternalState();
      this.handleNetsReq();
    }
  }

  componentWillUnmount() {
    if (this.netsTimer) {
      clearInterval(this.netsTimer);
      this.netsTimer = 0;
    }
  }

  resetInternalState() {
    if (this.netsTimer) {
      clearInterval(this.netsTimer);
      this.netsTimer = 0;
    }

    this.isApiCalled = false;

    this.setState({
      convertTime: { m: 5, s: "00" },
      secondsNetsTimeout: NETS_TIMEOUT_SECONDS,
      netsQrPayment: txnLoading,
      netsQrRetrievalRef: "",
      netsQrGenerate: false,
      netsQrResponseCode: "",
      openApiPaasTxnStatus: 0,
      networkCode: "",
      instruction: "",
      errorMsg: "",
      status: "pending",
    });
  }

  async requestNets() {
    try {
      this.setState({
        netsQrGenerate: true,
        status: "pending",
        netsQrPayment: txnLoading,
        errorMsg: "",
        instruction: "",
        secondsNetsTimeout: NETS_TIMEOUT_SECONDS,
        convertTime: { m: 5, s: "00" },
      });


      const res = await api.post('/nets-qr/request/' + this.props.orderId);

      const resData = res.data.result.data;

      if (
        resData.response_code === "00" &&
        resData.txn_status === 1 &&
        resData.qr_code
      ) {
        localStorage.setItem("txnRetrievalRef", resData.txn_retrieval_ref);
        this.setState(
          {
            netsQrResponseCode: resData.response_code,
            netsQrPayment: "data:image/png;base64," + resData.qr_code,
            netsQrRetrievalRef: resData.txn_retrieval_ref,
            networkCode: resData.network_status,
            openApiPaasTxnStatus: resData.txn_status,
          },
          () => this.startNetsTimer()
        );
      } else {
        this.setState({
          netsQrResponseCode:
            resData.response_code === "" ? "N.A." : resData.response_code,
          netsQrPayment: "",
          instruction:
            resData.network_status === 0 ? resData.instruction : "",
          errorMsg:
            resData.network_status !== 0 ? "Frontend Error Message" : "",
          networkCode: resData.network_status,
          openApiPaasTxnStatus: resData.txn_status,
          status: "fail",
        });
        if (this.props.onFail) this.props.onFail(resData);
      }
    } catch (error) {
      console.error(error);
      this.setState({
        errorMsg: "Error in requestNets",
        status: "fail",
      });
      if (this.props.onFail) this.props.onFail(error);
    } finally {
      this.isApiCalled = false;
    }
  }

  /**
   * Poll NETS for status.
   * isFinal = false → intermediate poll (only act on success)
   * isFinal = true → timeout poll (treat non-success as fail)
   */
  async queryNets(isFinal = false) {
    try {
      if (this.state.status !== "pending") return;

      let netsTimeoutStatus = isFinal ? 1 : 0;
      if (!this.state.netsQrRetrievalRef) return;

      const body = {
        txn_retrieval_ref: this.state.netsQrRetrievalRef,
        frontend_timeout_status: netsTimeoutStatus,
      };

      const res = await api.post('/nets-qr/query/' + this.props.orderId, body);

      const resData = res.data.result.data;

      const isSuccess =
        resData.response_code === "00" && resData.txn_status === 1;


      if (isSuccess) {
        if (this.netsTimer) {
          clearInterval(this.netsTimer);
          this.netsTimer = 0;
        }

        console.log("NETS payment successful!");

        // ✅ Just show success; don't close/reset popup here
        this.setState({ status: "success" });

        // Optional: let parent know payment succeeded
        if (this.props.onSuccess) {
          this.props.onSuccess(resData);
        }

      } else if (isFinal) {
        if (this.netsTimer) {
          clearInterval(this.netsTimer);
          this.netsTimer = 0;
        }
        this.setState({ status: "fail" });
        if (this.props.onFail) this.props.onFail(resData);
      }

    } catch (error) {
      console.error(error);
      if (isFinal) {
        this.setState({
          errorMsg: "Error in queryNets",
          status: "fail",
        });
        if (this.props.onFail) this.props.onFail(error);
      }
    }
  }


  startNetsTimer() {
    if (this.netsTimer === 0 && this.state.secondsNetsTimeout > 0) {
      // Initialize display
      this.setState({
        convertTime: this.convertTimeFormat(this.state.secondsNetsTimeout),
      });
      this.netsTimer = setInterval(this.decrementNetsTimer, 1000);
    }
  }

  convertTimeFormat(secs) {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return { m: minutes, s: seconds.toString().padStart(2, "0") };
  }

  decrementNetsTimer() {
    this.setState((prevState) => {
      if (prevState.status !== "pending") {
        // If already success/fail, stop timer
        if (this.netsTimer) {
          clearInterval(this.netsTimer);
          this.netsTimer = 0;
        }
        return prevState;
      }

      const secondsNetsTimeout = prevState.secondsNetsTimeout - 1;
      const convertTime = this.convertTimeFormat(
        Math.max(secondsNetsTimeout, 0)
      );

      // Poll every 5 seconds while waiting
      if (secondsNetsTimeout > 0 && secondsNetsTimeout % 5 === 0) {
        this.queryNets(false);
      }

      if (secondsNetsTimeout <= 0) {
        if (this.netsTimer) {
          clearInterval(this.netsTimer);
          this.netsTimer = 0;
        }
        // Final check with timeout flag
        this.queryNets(true);
      }

      return {
        convertTime,
        secondsNetsTimeout,
      };
    });
  }

  handleNetsReq() {
    if (!this.isApiCalled) {
      this.isApiCalled = true;
      this.requestNets();
    }
  }

  // 👇 Cancel should NOT close popup, just mark as fail
  handleNetsCancel() {
    if (this.netsTimer) {
      clearInterval(this.netsTimer);
      this.netsTimer = 0;
    }

    this.setState({
      status: "fail",
      secondsNetsTimeout: 0,
      convertTime: this.convertTimeFormat(0),
    });
    // No onClose here – user sees ❌ then clicks "Close"
  }

  handleClosePopup() {
    // Clean up and tell parent to hide
    this.resetInternalState();
    if (this.props.onClose) this.props.onClose();
  }

  renderContent() {
    const { status, netsQrGenerate, netsQrPayment, convertTime } = this.state;

    // ✅ SUCCESS VIEW
    if (status === "success") {
      return (
        <div className="netsQrPaymentGatewayWebpage">
          <h2 className="text" style={{ fontSize: 20, marginBottom: 10 }}>
            Payment Successful
          </h2>
          <img
            src={successIcon}
            alt="Payment Success"
            style={{ width: "120px", margin: "20px auto" }}
          />
          <button
            style={{
              backgroundColor: "#2e7d32",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              height: "40px",
              padding: "0 24px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={this.handleClosePopup}
          >
            Close
          </button>
        </div>
      );
    }

    // ❌ FAILURE VIEW
    if (status === "fail" && netsQrGenerate) {
      return (
        <div className="netsQrPaymentGatewayWebpage">
          <h2 className="text" style={{ fontSize: 20, marginBottom: 10 }}>
            Payment Failed / Timed Out
          </h2>
          <img
            src={failIcon}
            alt="Payment Failed"
            style={{ width: "120px", margin: "20px auto" }}
          />
          <button
            style={{
              backgroundColor: "#E02020",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              height: "40px",
              padding: "0 24px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={this.handleClosePopup}
          >
            Close
          </button>
        </div>
      );
    }

    // 🔄 PENDING / QR VIEW
    return (
      <div className="netsQrPaymentGatewayWebpage">
        <h2
          className="text"
          style={{ fontSize: 20, marginBottom: 10, marginTop: 10 }}
        >
          SCAN TO PAY
        </h2>
        <p className="text" style={{ fontSize: 18, fontWeight: 300 }}>
          Scan with your bank app to complete your payment
        </p>

        {/* 🔹 Center QR using flexbox */}
        <div
          className="netsQrCode"
          style={{
            marginTop: 20,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            id="imgNetsQr"
            style={{ maxWidth: "260px", width: "60%", height: "auto" }}
            src={netsQrPayment}
            alt="NETS QR"
          />
          
        </div>

        <h2 className="netsTimer" style={{ fontSize: 16, marginTop: 10 }}>
          {convertTime.m} : {convertTime.s}
        </h2>

        <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
          <img
            id="netsQrInfo"
            height="auto"
            width="60%"
            src={netsQrInfo}
            alt="NETS Info"
            style={{ marginTop: 10 }}
          />
        </div>

        <div className="button" style={{ marginTop: 20 }}>
          <button
            style={{
              backgroundColor: "#E02020",
              color: "#fff",
              borderRadius: "10px",
              fontSize: "14px",
              height: "40px",
              padding: "0 24px",
              border: "none",
              cursor: "pointer",
            }}
            onClick={this.handleNetsCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  render() {
    const { isOpen } = this.props;
    if (!isOpen) return null;

    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: "16px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            padding: "24px",
            width: "100%",
            maxWidth: "480px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <img
                src={netsQrLogo}
                alt="NETS QR"
                style={{ height: 32, objectFit: "contain" }}
              />
              <h2 style={{ fontSize: "18px", fontWeight: 600 }}>
                NETS QR Payment
              </h2>
            </div>
            <button
              onClick={this.handleClosePopup}
              style={{
                border: "none",
                background: "transparent",
                fontSize: "20px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <hr style={{ marginBottom: "12px" }} />

          {/* Content */}
          <div
            style={{
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {this.renderContent()}
          </div>
        </div>
      </div>
    );
  }
}

export default NetsQrPopup;
