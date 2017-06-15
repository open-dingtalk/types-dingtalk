const fs = require('fs');
const path = require('path');
const meta = require('./meta.json');
const APIMeta = JSON.parse(meta.data);

function resolve (dir) {
  return path.join(__dirname,'..', dir)
}

function cur (dir){
  return path.join(__dirname, '.', dir);
}

function APIDingtalk(){
  return new Promise(function(resolve,reject){
    fs.readFile(cur('dingtalk'),'utf8',function(err,data){
      if (err){
        console.log(JSON.stringify(err));
        return;
      }
      resolve(data);
    });
  });
}

function createApi(_name,_action){
  return function(params){}
}

function createFuns(name,funs){
  let s = Object.create(null);
  funs.forEach(function(action){
    s[action] = createApi(name, action);
  });
  return s;
}

function parseJsApis(jsApis){
  let apis = Object.create(null);
  for (let name in jsApis) {
    let node = name.split('.');
    let funs = jsApis[name];
    let staging = null;
    let i = 0;
    let j = node.length;
    while (true) {
      if (!staging) {
        if (1 === j) {
          let h = false;
          let p = apis[node[i]];
          let s = createFuns(name, funs);
          for (let x in p){
            if (p.hasOwnProperty(x)){
              h = true;
              break;
            }
          }
          if (h){
            for (let k in s){
              p[k] = s[k];
            }
          } else {
            apis[node[i]] = createFuns(name, funs);
          }
          break;
        }
        if (apis[node[i]]){
          staging = apis[node[i]];
          i++;
          continue;
        }
        apis[node[i]] = {};
        staging = apis[node[i]];
        i++;
        continue;
      } else {
        if ((j - 1) === i) {
          staging[node[i]] = createFuns(name, funs);
          break;
        }
        if (staging[node[i]]) {
          i++;
          continue;
        }
        staging[node[i]] = {};
        staging = staging[node[i]];
      }
      i++;
      if (i > j) {
        break;
      }
    }
  }
	return apis;
}

let pluginsApis = [];
let actionsApis = [];

function outputInterface(apis){
  let output = '';
  for(let key in apis){
    let v = apis[key];
    pluginsApis.push(key);
    output += 'interface API' + key + '{\n';
    for(let name in v){
      let actions = v[name];
      if (typeof actions === 'function'){
        output += '   '+name + '(parameter:APIParamType):void;\n';
      }
      if (typeof actions === 'object'){
        let con = Object.create(null);
        con[key.toLocaleUpperCase() + name] = actions;
        actionsApis.push(con);
        output += '   ' + name + ':API'+ key.toLocaleUpperCase() + name +'\n';
      }
    }
    output += '} \n\n';
  }
  return output;
}

APIDingtalk().then(function(data){
  
  let output = '';
  let apis = parseJsApis(APIMeta);
  output += 'type APIParamType = any;\n\n';
  output += outputInterface(apis);
  actionsApis.forEach(function(v){
    for(let key in v){
      output += 'interface API' + key + '{\n'
      let vs = v[key];
      for(let method in vs){
        output += '   '+method + '(parameter:APIParamType):void;\n';
      }
      output += '}\n\n';
    }
  });
  output += 'interface APIDingtalk{\n';
  pluginsApis.forEach(function(v){
    output += '   ' + v +':API'+ v + ';\n'; 
  });
  output += '}\n\n';
  output += data;
  fs.writeFile(resolve('types-dingtalk.d.ts'),output,function(err){
    if(err){
      console.log(JSON.stringify(err));
    } else {
      console.log('write success');
    }
  })
}).catch(function(err){
  console.log(JSON.stringify(err));
});