avalon.config({//似乎这里开头用avalon还是用require效果一样
	baseUrl: 'lib'//基础路径
//	paths: {
//		avalon: '../avalon.mobile.min.js'
//	},
//	shim: {
//		avalon: {
//			exports: 'avalon'
//		}
//	},
	,debug: false
});

var armor=[[[],[],[],[],[]],[[],[],[],[],[]]];
var gem=[];
var skillEffect={};
var skill=[];
var stone={};
var holeValue=[0,14,32,61];

function initSkill(list){//根据技能列表生成值全为0的对象
	var result={};
	for(var s=0;s<list.size();s++){
		result[list[s].n]=0;
	}
	return result;
}

function enable(i){//技能选择的过滤，2个条件，过滤过的-已选择
	var flag=true;
	vm.selected.forEach(function(val){
		if(i.n==val.n) flag=false;
	});
	if(vm.condition!='' && i.n.indexOf(vm.condition)<0) flag=false;
	return flag;
}

var vm = avalon.define({
	$id: "mho",
	popup: "",//弹出层id，没有就不弹出
	closable: true,//允许弹出层点击关闭
	skill: [],//可选择的技能
	selected: [],//已选择的技能
	armor: [],//已选择的护甲
	gem: [],//可选择的珠子
	stone: [],//可选择的护石
	own: [],//已拥有技能
	info: '',//loading时的内容
	condition: '',//技能选择的过滤条件
	$computed: {
		ranged: {//从localStorage读取是否远程
			set: function(val){
				localStorage.setItem("ranged",val);
			},
			get: function(){
				if(localStorage.getItem("ranged")) return eval(localStorage.getItem("ranged"));
				else return false;
			}
		}
	},
	hidePopup: function(e){//隐藏弹出层
		if(vm.closable && e.target.nodeName.toLowerCase()=="div") vm.popup="";
	},
	listSkill: function(){//列出待选择的技能
		vm.skill=skill.filter(enable);
		vm.closable=true;
		vm.popup="skill_choose";
	},
	addSkill: function(skill,i){//添加选择的技能
		vm.selected.push({n: skill.n, v: skill.v, r: 10, hv:[0,0,0,0], s:skill.s});
		vm.condition="";
		vm.popup="";
	},
	skillMinus: function(s){//技能需求减少
		s.r--;
	},
	skillPlus: function(s){//技能需求增加
		s.r++;
	},
	skillJoin: function(s){//拼技能字符串
		var t=[];
		for(var i in s){
			t.push(i+s[i]);
		}
		return t.join("，");
	},
	showChosen: function(a){//物品说明折叠
		a.o=!a.o;
	},
	secondary: false,
	showSecondary: function(){
		vm.secondary=!vm.secondary;
	},
	calc: function(){//配装
		var revise=initSkill(vm.selected);//权重修正值
		var r=vm.ranged?1:0;
		var own={};//已拥有属性值
		vm.gem=[];
		vm.stone=[];
		//筛选珠子初始化孔平均价值
		holeValue=[0,0,0,0];
//		var tr=0;
//		for(var s=0;s<vm.selected.size();s++){
//			tr+=vm.selected[s].r-own[vm.selected[s].n];
//		}
		for(var s=0;s<vm.selected.size();s++){
			vm.selected[s].hv=[0,0,0,0];
		}
		for(var h=1;h<=3;h++){
			for(var i in gem){
				if(gem[i].h==h){
					var si=-1;
					for(var s=0;s<vm.selected.size();s++){
						var name=vm.selected[s].n;
						if(name in gem[i].s && gem[i].s[name]>0){
							si=s;
						}
					}
					if(si>-1){
						for(var s=0;s<vm.selected.size();s++){
							var name=vm.selected[s].n;
							if(name in gem[i].s){
								vm.selected[si].hv[h]+=gem[i].s[name]*vm.selected[s].v;
							}
						}
					}
				}
			}
		}
		for(var h=1;h<=3;h++){
			for(var s=0;s<vm.selected.size();s++){
				var name=vm.selected[s].n;
				if(vm.selected[s].hv[h]==0) vm.selected[s].hv[h]=h==1?10:vm.selected[s].hv[1]+vm.selected[s].hv[h-1];
				holeValue[h]+=vm.selected[s].hv[h];
			}
			holeValue[h]=holeValue[h]/vm.selected.size();
		}
		//选护甲
		do{
			own=initSkill(vm.selected);
			vm.armor=[];
			for(var i=0;i<5;i++){
				var max=0;
				var id=-1;
				for(var j in armor[r][i]){
					var val=holeValue[armor[r][i][j].h];
					for(var s=0;s<vm.selected.size();s++){
						var name=vm.selected[s].n;
						if(name in armor[r][i][j].s){
							val+=vm.selected[s].v*armor[r][i][j].s[name]*vm.selected[s].r/(vm.selected[s].r+revise[name]*1.5);
						}
					}
					if(val>max){
						max=val;
						id=j;
					}
				}
				if(max>0){
					vm.armor.push(armor[r][i][id]);
				}
			}
			var over=0;
			var under=0;
			for(var s=0;s<vm.selected.size();s++){
				var name=vm.selected[s].n;
				for(var i=0;i<vm.armor.size();i++){
					if(name in vm.armor[i].s) own[name]+=vm.armor[i].s[name];
				}
				if(own[name]>vm.selected[s].r+revise[name]){
					revise[name]++;
					over++;
				}else if(own[name]<vm.selected[s].r) under++;
			}
		}while(over>0&&under>0);
		//筛选已有技能和最大孔数
		var maxHole=0;
		own=initSkill(vm.selected);
		vm.own=[];
		for(var i=0;i<vm.armor.size();i++){
			if(vm.armor[i].h>maxHole) maxHole=vm.armor[i].h;
			for(var s in vm.armor[i].s){
				if(s in own) own[s]+=vm.armor[i].s[s];
				else own[s]=vm.armor[i].s[s];
			}
		}
		Object.keys(own).forEach(function(val){
			vm.own.push({n: val, v: own[val]});
		});
		vm.own.sort(function(a,b){
			var m=vm.selected.size();
			var n=m;
			vm.selected.forEach(function(val,i){
				if(a.n==val.n) m=i;
				if(b.n==val.n) n=i;
			});
			return m-n;
		});
		//选技能珠和护石
		for(var s=0;s<vm.selected.size();s++){
			var name=vm.selected[s].n;
			if(vm.selected[s].s && vm.selected[s].r>own[name]){
				vm.stone.push(vm.selected[s].s);
			}
			for(var i in gem){
				if(name in gem[i].s && gem[i].s[name]>0 && gem[i].s[name]<=vm.selected[s].r-own[name]){
					vm.gem.push(gem[i]);
				}
			}
		}
	},
	reload: function(){//重新获取数据
		vm.popup="before_loading";
		vm.closable=true;
	},
	load: function(){}//给获取数据的方法占位
});

vm.$watch("condition", function(a, b) {
	vm.skill=skill.filter(enable);
});

vm.$watch("popup", function(a, b) {
	if(a!=""){
		document.documentElement.scrollTop=0;
		document.body.scrollTop=0;
	}
});

require(["domReady!", "mmRequest"], function() {
	var last=localStorage.getItem("update");
	if(last){
		if(new Date(last).getTime()>1454463500588){
			vm.popup="loading";
			vm.closable=false;
			vm.info="读取本地缓存…";
			var p=new Promise(function(resolve, reject){
				armor=JSON.parse(localStorage.getItem("armor"));
				skill=JSON.parse(localStorage.getItem("skill"));
				gem=JSON.parse(localStorage.getItem("gem"));
				resolve("读取本地缓存…");
			});
			p.then(function(){
				vm.popup="";
			});
		}else{
			vm.popup="loading";
			vm.info="已更新算法和数据，旧数据虽仍可用，建议点击“重新读取数据”更新数据…";
			vm.closable=true;
		}
	}else{
		vm.popup="before_loading";
		vm.closable=false;
	}

	vm.load=function(){
		vm.popup="loading";
		vm.closable=false;
		vm.info="数据读取中…";
		avalon.get('all.json')
		.done(function(json){
			if(json.errCode==0 && json.msg=="success"){
				armor=[[[],[],[],[],[]],[[],[],[],[],[]]];
				skill=[];
				gem=[];
				vm.selected=[];
				var all=json.result;
				for(var i in all){
					var obj=all[i];
					var iid=obj.iID;
					var idata=obj.data;
					if(6E4<=iid && iid<7e4 && idata[12]>=40){//所有护甲
						var a=idata[3];
						var b=iid%5;
						var _m=[];
						for(var j=21;j<37;j+=3){
							if(idata[j]!="") _m.push(idata[j]+"x"+idata[j+1]);
						}
						var _s={};
						for(var j=38;j<47;j+=2){
							if(idata[j]!="#N/A") _s[idata[j]]=parseInt(idata[j+1],10);
						}
						obj={n: idata[1], h: idata[5], m: _m.join("，"), s: _s, o: false};
						armor[a][b].push(obj);
					}else if(1E6<=iid && iid<2e6){//所有技能
						if(idata[3]!="无") skillEffect[idata[3]]=10;
					}else if(2E6<=iid && iid<3e6){//所有护石
						stone[idata[2]]=idata.slice(2);
						skillEffect[idata[2]]=idata[7]==0?7:parseInt(100/idata[7],10);
					}else if(5E6<=iid && iid<6e6){//所有珠子
						var _m=[idata[13]+"x"+idata[14],idata[15]+"x"+idata[16]];
						if(idata[17]!="") _m.push(idata[17]+"x"+idata[18]);
						var _s={};
						_s[idata[5]]=parseInt(idata[6],10);
						if(idata[8]!="") _s[idata[8]]=parseInt(idata[9],10);
						obj={n: idata[2], h: idata[3], m: _m.join("，"), s: _s, o: false};
						gem.push(obj);
					}
				}
//				skillEffect.匠=50;
//				skillEffect.装填术=50;
				Object.keys(skillEffect).forEach(function(val){
					skill.push({n: val, v: skillEffect[val], s: stone[val]});
				});
				localStorage.setItem("armor",JSON.stringify(armor));
				localStorage.setItem("skill",JSON.stringify(skill));
				localStorage.setItem("gem",JSON.stringify(gem));
				localStorage.setItem("update",new Date());
				vm.popup="";
			}else{
				vm.info="数据读取失败…请稍后再试";
			}
		})
		.fail(function(){vm.info="数据读取失败…请稍后再试";});
	};

//	avalon.history.start({});
});
