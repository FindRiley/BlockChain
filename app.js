const assert = require('assert')
const path = require('path')
const Configuration = require('../nodejs-sdk/packages/api/common/configuration').Configuration
const { Web3jService, ConsensusService, SystemConfigService } = require('../nodejs-sdk/packages/api/web3j')
const express = require('express')
const fs = require('fs');
const utils = require('../nodejs-sdk/packages/api/common/utils');
const getAbi = require('../nodejs-sdk/packages/cli/interfaces/base').getAbi;
const session = require('express-session');
var cookieParser = require('cookie-parser');

const contractName = "Finorm";
const contractAddress = "0xdb030e6a567d19b1a06de3f6e08223be082d009d";
const abi = getAbi(contractName);
const web3jService = new Web3jService();
var   router = express.Router();
var   app = express();
var   bodyParser = require('body-parser');
var   urlencodedParser = bodyParser.urlencoded({ extended: true });

Configuration.setConfig(path.join(__dirname, './conf/config.json'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json({"limit":"10000kb"}));
app.use(cookieParser('sessiontest'));
app.use(session({
 secret: 'sessiontest',//与cookieParser中的一致
 resave: true,
 saveUninitialized:true
}));

var data = {};
var trans = [];
var mes = '';

app.get('/signin',function(req,res) {
  req.session.username = '';
  console.log('get signin');
  res.render(path.join(__dirname, "/views/login"),{
    method1: '<button type = "submit" class="btn btn-greensea">Log In</button>',
    method2: '<a href="/signup"><label class="btn btn-slategray">Create an account</label></a>',
    message: mes
  });
  mes = '';
})

app.get('/',function(req,res) {
  res.redirect('/signin');
})

app.get('/signup',function(req,res) {
  console.log('get signup');
  res.render(path.join(__dirname, "/views/login"), {
    method1: '<button type = "submit" class="btn btn-greensea">Create an account</button>',
    method2: '<a href="/signin"><label class="btn btn-slategray">Log In</label></a>',
    message: mes
  });
  mes = '';
})

app.get('/home', function(req, res){
  console.log('redirect to home');
  console.log("data:", data);
  console.log('Homeusername:', req.session.username);
  if (req.session.username == '') {
    res.redirect('/signin');
    return;
  }
  res.render(path.join(__dirname, "/views/home"),{
      message:    "signin in successfully",
      username:   req.session.username,
      balance:    data.balance,
      bill:       data.bill,
      reputation: data.reputation
  });
  data = {};
  mes = '';
})

app.post('/signin', urlencodedParser, function (req, res) {
  console.log("login...");
  console.log("req.body:", req.body);
  let functionName = "Signin";
  let parameters = [req.body.username, req.body.password];
  if (parameters[0] == '' || parameters[1] == '') {
    res.redirect('/signin');
    return;
  }
  else {
    call(functionName, parameters).then(result => {
      console.log("result:", result);
      if (result.output.pass) {
        //res.status(302);
        data = {
          address: req.body.username,
          balance: result.output.balance,
          bill: result.output.bill,
          reputation: result.output.reputation 
        }
        req.session.username = data.address;
        res.redirect('/home');
      }
      else {
        mes = '<div>Invalid username or password</div>'
        res.redirect('/signin');
      }
    });
  }
})

app.post('/signup', urlencodedParser, function (req, res) {
  console.log("sign up...");
  console.log("req.body:", req);
  let functionName = "SignUp";
  let parameters = [req.body.username, req.body.password];
  if (parameters[0] == '' || parameters[1] == '') {
    res.redirect('/signup');
    return;
  }

  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result.output.pass) {
      mes = '<div>Create an account successfully</div>';
      res.redirect('/signup');
    }
    else {
      mes = '<div>Invalid username</div>';
      res.redirect('/signup');
    }
  });
})

app.get('/user/bills', urlencodedParser, function (req, res) {
  console.log("get Bills");
  console.log(req.body);
  let functionName = "getBill";
  let parameters = [req.body.querier, req.body.ones];
  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result.status == 0) {
      res.status(200);
      res.json({
          message : "get Bills",
          data : result
      });
    }
    else {
      res.status(404);
      res.send("Error");
    }
  });
})

function getTrans(req, res){
  console.log('redirect to transaction');
  console.log("req:", req.session);
  console.log("Billusername:", req.session.username);
  if (req.session.username == '' || trans.length < 1) {
    res.status(404);
    return;
  }
  
  console.log("trans", trans);
  res.status(200);
  res.render(path.join(__dirname, "/views/transaction"),{
      items:    trans
  });
  trans = [];
}

app.get('/createBill', function(req, res){
  console.log('jump to createBill');
  console.log("req:", req.session);
  console.log("Billusername:", req.session.username);
  if (req.session.username == '') {
    res.redirect('/signin');
    return;
  }
  if (trans.length < 1) {
    trans = [
      '<input class="address has-border" type="text" placeholder="付款人" name="payer">',
      '<input class="address has-border" type="text" value="收款人：' + req.session.username.toString() + '" name="payee" readonly="readonly">',
      '<input class="uint has-border" type="text" placeholder="交易总额" name="amount">'
    ];
  }
  console.log("trans", trans);
  res.render(path.join(__dirname, "/views/transaction"),{
      items:    trans
  });
  trans = [];
})

app.post('/createBill', urlencodedParser, function (req, res) {
  console.log("create a bill");
  console.log(req.body);
  let functionName = "createBill";
  let parameters = [req.body.payer, req.session.username, req.body.amount];
  if (parameters[0] == '' || parameters[1] == '' || parameters[2] == '') {
    res.redirect('/createBill');
    return;
  }

  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result.status == 0) {
      trans = [
        '<div class="result">time:'  + result.output[0].toString() +'</div>',
        '<div class="result">payer:' + result.output[1].toString() +'</div>',
        '<div class="result">payee:' + result.output[2].toString() +'</div>',
        '<div class="result">amount:'+ result.output[3].toString() +'</div>',
      ];
      //res.redirect('/transaction');
      getTrans(req, res)
    }
    else {
      res.redirect('/createBill');
    }
  });
})

app.get('/transferBill', function(req, res){
  console.log('jump to transferBill');
  console.log("req:", req.session);
  console.log("Billusername:", req.session.username);
  if (req.session.username == '') {
    res.redirect('/signin')
    return;
  }
  if (trans.length < 1) {
    trans = [
      '<input class="uint has-border" type="text" placeholder="时间" name="time">',
      '<input class="address has-border" type="text" value="原付款人：' + req.session.username.toString() + '" name="payer" readonly="readonly">',
      '<input class="address has-border" type="text" placeholder="转让到" name="mid">',
      '<input class="address has-border" type="text" placeholder="收款人" name="payee">'
    ];
  }
  console.log("trans", trans);
  res.status(200);
  res.render(path.join(__dirname, "/views/transaction"),{
      items:    trans
  });
  trans = [];
})

app.post('/transferBill', urlencodedParser, function (req, res) {
  console.log("transfer a bill");
  console.log(req.body);
  let functionName = "transferBill";
  let parameters = [req.body.time, req.session.username, req.body.mid, req.body.payee];
  for (i = 0; i < parameters.length; ++i) {
    if (parameters[i] == ''){
      res.redirect('/transferBill');
      return;
    }
  }

  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result.status == 0) {
      trans = [
        '<div class="result">newtime: '  + result.output[0].toString() +'</div>',
        '<div class="result">Mid: ' + result.output[1].toString() +'</div>',
        '<div class="result">amount: '+ result.output[2].toString() +'</div>',
      ];
      //res.redirect('/transaction');
      getTrans(req, res)
    }
    else {
      res.redirect('/transferBill');
    }
  });
})

app.get('/requestFinancing', function(req, res){
  console.log('jump to requestFinancing');
  console.log("req:", req.session);
  console.log("Billusername:", req.session.username);
  if (req.session.username == '') {
    res.redirect('/signin');
    return;
  }
  if (trans.length < 1) {
    trans = [
      '<input class="address has-border" type="text" placeholder="账单付款人" name="payer">',
      '<input class="address has-border" type="text" value="账单收款人：' + req.session.username.toString() + '" name="payee" readonly="readonly">',
      '<input class="uint has-border" type="text" placeholder="账单时间" name="time">',
      '<input class="uint has-border" type="text" placeholder="融资金额" name="amount">'
    ];
  }
  console.log("trans", trans);
  res.status(200);
  res.render(path.join(__dirname, "/views/transaction"),{
      items:    trans
  });
  trans = [];
})

app.post('/requestFinancing', urlencodedParser, function (req, res) {
  console.log("Request financing from the bank");
  console.log(req.body);
  let functionName = "requestFinancing";
  let parameters = [req.body.payer, req.session.username, req.body.time, req.body.amount];
  for (i = 0; i < parameters.length; ++i) {
    if (parameters[i] == ''){
      res.redirect('/requestFinancing');
      return;
    }
  }

  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result.status == 0) {
      trans = [
        '<div class="result">OK: '  + result.output[0].toString() +'</div>',
        '<div class="result">amount: ' + result.output[1].toString() +'</div>'
      ];
      //res.redirect('/transaction');
      getTrans(req, res)
    }
    else {
      res.status(400)
      res.redirect('/requestFinancing');
    }
  });
})

app.get('/settleBill', function(req, res){
  console.log('jump to settleBill');
  console.log("req:", req.session);
  console.log("Billusername:", req.session.username);
  if (req.session.username == '') {
    res.redirect('/signin');
    return;
  }
  if (trans.length < 1) {
    trans = [
      '<input class="address has-border" type="text" value="账单付款人：' + req.session.username.toString() + '" name="payee" readonly="readonly">',
      '<input class="uint has-border" type="text" placeholder="账单时间" name="time">'
    ];
  }
  console.log("trans", trans);
  res.status(200);
  res.render(path.join(__dirname, "/views/transaction"),{
      items:    trans
  });
  trans = [];
})

app.post('/settleBill', urlencodedParser, function (req, res){
  console.log("settle a bill");
  console.log(req.body);
  let functionName = "settleBill";
  let parameters = [req.session.username, req.body.time];
  for (i = 0; i < parameters.length; ++i) {
    if (parameters[i] == ''){
      res.redirect('/settleBill');
      return;
    }
  }

  call(functionName, parameters).then(result => {
    console.log("result:", result);
    if (result) {
      trans = [
        '<div class="result">amount: ' + result.output[0].toString() +'</div>'
      ];
      //res.redirect('/transaction');
      getTrans(req, res)
    }
    else {
      res.status(400)
      res.redirect('/settleBill');
    }
  });
})

app.listen(8080, function () {
  console.log('listening 127.0.0.1:8080');
})

function call(functionName, parameters){
  if (parameters.length < 1) {
    return "bad request";
  }
  if (abi) {
    //console.log("abi:", abi);
    console.log("func:", functionName);
    console.log("params:", parameters);
    for (let item of abi) {
      if (item.name === functionName && item.type === 'function') {
        if (item.inputs.length !== parameters.length) {
          throw new Error(`wrong number of parameters for function \`${item.name}\`, expected ${item.inputs.length} but got ${parameters.length}`);
        }

        functionName = utils.spliceFunctionSignature(item);

        if (item.constant) {
          return web3jService.call(contractAddress, functionName, parameters).then(result => {
            let status = result.result.status;
            let ret = {
                status: status
            };
            let output = result.result.output;
            if (output !== '0x') {
                ret.output = utils.decodeMethod(item, output);
            }
            return ret;
          });
        } else {
          return web3jService.sendRawTransaction(contractAddress, functionName, parameters).then(result => {
            let txHash = result.transactionHash;
            let status = result.status;
            console.log("result1:", result);

            let ret = {
                transactionHash: txHash,
                status: status
            };
            let output = result.output;
            if (output !== '') {
                ret.output = utils.decodeMethod(item, output);
            }
            return ret;
          });
        }
      }
    }
  }
  throw new Error(`no abi file for contract ${contractName}`);
}