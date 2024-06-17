sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageItem",
    "sap/m/MessageView",
    "sap/m/MessageBox",
    'sap/ui/core/library',
    'sap/m/Dialog',
    'sap/m/Button',
    'sap/m/Bar',
    'sap/m/Title',
    'sap/ui/core/IconPool',
    "sap/m/MessageToast",
    "sap/ui/model/odata/v2/ODataModel"
],
    function (Controller, Fragment, JSONModel, MessageItem, MessageView, MessageBox, coreLibrary, Dialog, Button, Bar, Title, IconPool, MessageToast, ODataModel) {
        "use strict";
        var TitleLevel = coreLibrary.TitleLevel;
        return {
            inputAmountDialog: null,
            reviewDialog: null,
            inputHeaderDialog: null,
            busyDialog: null,
            deNghiData: null,
            onInitSmartFilterBarExtension: function(oSource){
                console.log('onInitSmartFilterBarExtension')
                var filterObject = this.getView().byId("listReportFilter")
                let defaultValue = {
                    "$Parameter.P_FiscalYear" : new Date().getFullYear()
                }
                filterObject.setFilterData(defaultValue)
            },
            onInit: function (oEvent) {
                
                Fragment.load({
                    id: "busyFragment",
                    name: "zkc.ext.fragment.Busy",
                    type: "XML",
                    controller: this
                })
                .then((oDialog) => {
                    this.busyDialog = oDialog;
                    
                })
                .catch(error => {
                    MessageBox.error('Vui lòng tải lại trang')
                });                
            },
            onCloseReviewDialog: function () {
                this.reviewDialog.close()
            },
            getKCData: function(){
                var thatController = this
                var filterObject = this.getView().byId("listReportFilter").getFilterData()
                console.log(filterObject)
                thatController.busyDialog.open()
                let oModel = thatController.getView().getModel()
                let urlParams = `P_CompanyCode='${filterObject['$Parameter.P_CompanyCode']}',P_FiscalYear='${filterObject['$Parameter.P_FiscalYear']}',P_FiscalPeriod='0${filterObject['$Parameter.P_FiscalPeriod']}',P_RuleType='${filterObject['$Parameter.P_RuleType']}'`
                return new Promise((resolve, reject) => {
                    oModel.read(`/ZFI_I_KC_FINAL(${urlParams})/Results`, {
                        success: function (oData, oResponse) {
                            let date = oData.results[0].FiscalPeriodEndDate
                            const VND = new Intl.NumberFormat('en-DE');
                            let reviewData = {
                                ruleType_Ui :`<strong>Rule type:</strong> ${oData.results[0].RuleTypeDes}`,
                                ruleType : `${filterObject['$Parameter.P_RuleType']}`,
                                companyCode_Ui : `<strong>Company code: </strong>${filterObject['$Parameter.P_CompanyCode']}`,
                                companyCode : `${filterObject['$Parameter.P_CompanyCode']}`,
                                fiscalYear: `${filterObject['$Parameter.P_FiscalYear']}`,
                                fiscalPeriod: `${filterObject['$Parameter.P_FiscalPeriod']}`,
                                ruleType: `${filterObject['$Parameter.P_RuleType']}`,
                                documenType_Ui : '<strong>Document type: </strong>KC',
                                documenType : 'KC',
                                postingDate :  `${date.getFullYear()}${("0" + (date.getMonth() + 1)).slice(-2)}${date.getDate()}`,
                                postingDate_Ui : `<strong>Posting date: </strong>${date.getDate()}/${("0" + (date.getMonth() + 1)).slice(-2)}/${date.getFullYear()}`,
                                documentDate : `${date.getFullYear()}${("0" + (date.getMonth() + 1)).slice(-2)}${date.getDate()}`,
                                documentDate_Ui : `<strong>Document date: </strong>${date.getDate()}/${("0" + (date.getMonth() + 1)).slice(-2)}/${date.getFullYear()}`,
                                items : []
                            }
                            var listTarget = new Map()
                            oData.results.forEach((value, index) => {
                                if (value.StatusCritical == 3) {
                                    reject({message: 'Đã post chứng từ kết chuyển'})
                                }
                                let TotalAmtInCoCodeCrcyNumber = parseFloat(value.TotalAmtInCoCodeCrcy)
                                let temp_id = `${value.TargetAccount}${value.TargetCostCenter}${value.OffsettingAccount}${value.OffsettingCostCenter}`
                                if (!listTarget.has(temp_id)) {
                                    listTarget.set(temp_id, {
                                        amount : TotalAmtInCoCodeCrcyNumber,    
                                        tarGlaccount : value.TargetAccount,
                                        currency: value.CompanyCodeCurrency,
                                        tarCostcenter: value.TargetCostCenter,
                                        tarProfitCenter: value.TargetProfitCenter,
                                        tarTaxCode: value.TargetTaxCode,
                                        offGlaccount: value.OffsettingAccount,
                                        offCostcenter: value.OffsettingCostCenter,
                                        offProfitCenter: value.OffsettingProfitCenter,
                                        offTaxCode: value.OffsettingTaxCode,
                                    })
                                } else {
                                    let temp_val = {
                                        amount :  listTarget.get(temp_id).amount + TotalAmtInCoCodeCrcyNumber,
                                        tarGlaccount : value.TargetAccount,
                                        tarCostcenter: value.TargetCostCenter,
                                        tarProfitCenter: value.TargetProfitCenter,
                                        tarTaxCode: value.TargetTaxCode,
                                        currency: value.CompanyCodeCurrency,
                                        offGlaccount: value.OffsettingAccount,
                                        offCostcenter: value.OffsettingCostCenter,
                                        offProfitCenter: value.OffsettingProfitCenter,
                                        offTaxCode: value.OffsettingTaxCode,
                                    }
                                    listTarget.set(temp_id,  temp_val )
                                }
        
                            })
                            for (let key of listTarget.keys()) {
                                if (listTarget.get(key).amount == 0)
                                listTarget.delete(key);
                              }
                            let v_item = 0
                            Array.from(listTarget.values()).forEach((value, index)=>{
                                if  (value.amount > 0) {
                                    v_item += 1
                                    reviewData.items.push({
                                        item: v_item,
                                        postingkey : '40',
                                        amount : Math.abs(value.amount),
                                        amount_Ui : VND.format(Math.abs(value.amount)),
                                        glacount : value.tarGlaccount,
                                        costcenter: value.tarCostcenter,
                                        profitcenter: value.tarProfitCenter,
                                        taxcode: value.tarTaxCode,
                                        currency: value.currency
                                    })
                                    v_item += 1
                                    reviewData.items.push({
                                        item: v_item,
                                        postingkey : '50',
                                        amount : Math.abs(value.amount),
                                        amount_Ui : VND.format(Math.abs(value.amount)),
                                        glacount : value.offGlaccount,
                                        costcenter: value.offCostcenter,
                                        profitcenter: value.offProfitCenter,
                                        taxcode: value.offTaxCode,
                                        currency: value.currency
                                    })
                                } else {
                                    v_item += 1
                                    reviewData.items.push({
                                        item: v_item,
                                        postingkey : '40',
                                        amount : Math.abs(value.amount),
                                        amount_Ui : VND.format(Math.abs(value.amount)),
                                        glacount : value.offGlaccount,
                                        costcenter: value.offCostcenter,
                                        profitcenter: value.offProfitCenter,
                                        taxcode: value.offTaxCode,
                                        currency: value.currency
                                    })
                                    v_item += 1
                                    reviewData.items.push({
                                        item: v_item,
                                        postingkey : '50',
                                        amount : Math.abs(value.amount),
                                        amount_Ui : VND.format(Math.abs(value.amount)),
                                        glacount : value.tarGlaccount,
                                        costcenter: value.tarCostcenter,
                                        profitcenter: value.tarProfitCenter,
                                        taxcode: value.tarTaxCode,
                                        currency: value.currency
                                    })
                                    
                                }
                            })
                            resolve(reviewData)
                        },
                        error: function (error) {
                            reject(error)
                        }
                    })
                })
            },
            onActionPreview: function (ơEvent) {
                var thatController = this
                let getKCData = this.getKCData()
                getKCData
                .then((reviewData)=>{
                    let reviewModel = new JSONModel(reviewData);
                    if (!thatController.reviewDialog) {
                        Fragment.load({
                            id: "reviewFragment",
                            name: "zkc.ext.fragment.ViewAccount",
                            type: "XML",
                            controller: thatController
                        })
                            .then((oDialog) => {
                                thatController.reviewDialog = oDialog;
                                thatController.reviewDialog.setModel(reviewModel, "ReviewData")
                                thatController.reviewDialog.open()
                                thatController.busyDialog.close()
                            })
                            .catch(error => {
                                MessageBox.error('Vui lòng tải lại trang')
                            });
                    } else {
                        thatController.reviewDialog.setModel(reviewModel, "ReviewData")
                        thatController.reviewDialog.open()
                        thatController.busyDialog.close()
                    } 
                })
                .catch((error) =>{
                    MessageBox.error(`Có lỗi xảy ra : ${error.message}`)
                    thatController.busyDialog.close()
                })
            },
            getDocumentKC: function (oEvent) {
                var thatController = this
                var filterObject = this.getView().byId("listReportFilter").getFilterData()
                thatController.busyDialog.open()
                
                let urlParams = `https://${window.location.hostname}/sap/opu/odata/sap/ZFI_API_DOCKC_CURRENT_O2`
                let oModel = new ODataModel(urlParams, {json : true })
                return new Promise((resolve, reject) => {
                    console.log(oModel)
                    oModel.read(`/zfi_i_dockc_current(P_CompanyCode='${filterObject['$Parameter.P_CompanyCode']}',P_FiscalYear='${filterObject['$Parameter.P_FiscalYear']}',P_FiscalPeriod='0${filterObject['$Parameter.P_FiscalPeriod']}',P_RuleType='${filterObject['$Parameter.P_RuleType']}')/Set`, {
                        success: function (oData, oResponse) {
                            let docKC = {
                                accountingdocument : oData.results[0].Belnr,
                                companyCode : oData.results[0].Companycode,
                                fiscalYear : oData.results[0].Fiscalyear,
                                fiscalPeriod : oData.results[0].P_FiscalPeriod,
                                ruleType : oData.results[0].Rulty,
                                postingDate :`${oData.results[0].PostingDate.getFullYear()}${( "0" + (oData.results[0].PostingDate.getMonth() + 1)).slice(-2) }${oData.results[0].PostingDate.getDate()}`
                                
                            }
                            resolve(docKC)
                        },
                        error: function (error) {
                            reject(error)
                        }
                    })
                })
            },
            onPostKC: function (oEvent) {
                var thatController = this
                let getKCData = this.getKCData()
                let oModel = this.getView().getModel()
                getKCData
                .then((postData)=>{
                    var url_render = "https://" + window.location.hostname + "/sap/bc/http/sap/ZFI_API_KETCHUYEN?=";
                    $.ajax({
                        url: url_render,
                        type: "POST",
                        contentType: "application/json",
                        data: JSON.stringify(postData), //request,
                        success: function (response, textStatus, jqXHR) {
                            var that = this
                            let message = []
                            let responseJSON = JSON.parse(response)
                            responseJSON.messages.forEach((value) => {
                                message.push({
                                    type: value.type,
                                    title: value.message
                                })
                            })
                            var oMessageTemplate = new MessageItem({ // Message view template
                                type: '{type}',
                                title: '{title}'
                            });    
                            this.oCallApiMsgView = new MessageView({ //MessageView for response from Post FI Doc API
                                showDetailsPageHeader: false,
                                itemSelect: function () {
                                    oBackButton.setVisible(true);
                                },
                                items: {
                                    path: "/",
                                    template: oMessageTemplate
                                }
                            })
                            var oBackButton = new Button({ //Back button for response from Post FI Doc API
                                icon: IconPool.getIconURI("nav-back"), 
                                visible: false,
                                press: function () {
                                    that.oCallApiMsgView.navigateBack();
                                    this.setVisible(false);
                                }
                            });
                            this.oCallApiMsgViewDialog = new Dialog({ //Dialog for response from Post FI Doc API
                                resizable: true,
                                content: this.oCallApiMsgView,
                                state: 'Information',
                                beginButton: new Button({
                                    press: function () {
                                        this.getParent().close();
                                    },
                                    text: "Close"
                                }),
                                customHeader: new Bar({
                                    contentLeft: [oBackButton],
                                    contentMiddle: [
                                        new Title({
                                            text: "Messages",
                                            level: TitleLevel.H1
                                        })
                                    ]
                                }),
                                contentHeight: "50%",
                                contentWidth: "50%",
                                verticalScrolling: false
                            })
                            let messageJSON = JSON.parse(JSON.stringify(message))
                            var oMsgModel = new JSONModel();
                            oMsgModel.setData(messageJSON)
                            this.oCallApiMsgView.setModel(oMsgModel)
                            this.oCallApiMsgView.navigateBack();
                            this.oCallApiMsgViewDialog.open();
                            thatController.busyDialog.close();
                            oModel.refresh()
                        },
                        error: function (data) {
                            thatController.busyDialog.close();
                            MessageBox.error(`Đã có lỗi xảy ra. ${error.message}`)
                            console.log('message Error' + JSON.stringify(data));
                        }
                    }); 
                })
                .catch((error) =>{
                    thatController.busyDialog.close();
                    MessageBox.error(`Có lỗi xảy ra ${error.message}`)
                })
            },
            onReverseKC : function (oEvent) {
                var thatController = this
                let getDocumentKC = this.getDocumentKC()
                getDocumentKC
                .then((docKC) => {
                    docKC.isreverse = 'X'
                    var url_render = "https://" + window.location.hostname + "/sap/bc/http/sap/ZFI_API_KETCHUYEN?=";
                    $.ajax({
                        url: url_render,
                        type: "POST",
                        contentType: "application/json",
                        data: JSON.stringify(docKC), 
                        success: function (response, textStatus, jqXHR) {
                            let responseJSON = JSON.parse(response)
                            if (responseJSON.messages[0].message) {
                                if  (responseJSON.messages[0].type == 'Success') {
                                    MessageBox.success(`Đã huỷ thành công : ${ responseJSON.messages[0].message}`)
                                } else {
                                    MessageBox.error(`${ responseJSON.messages[0].message}`)
                                }

                            } else {
                                MessageBox.error(`Error exits`)
                            }
                            
                            thatController.busyDialog.close();
                            thatController.getView().getModel().refresh()
                        },
                        error: function (error) {
                            thatController.busyDialog.close();
                            MessageBox.error(`Đã có lỗi xảy ra. ${error.message}`)
                            console.error('message Error' + JSON.stringify(data));
                        }})
                })
                .catch((error)=>{
                    thatController.busyDialog.close();
                    MessageBox.error(`Đã có lỗi xảy ra. ${error.message}`)
                    console.error('message Error' + JSON.stringify(data));
                })
            }
        }
    }
)