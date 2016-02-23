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
var estimate_hv=[0,14,32,61];

function initSkill(val){//根据技能列表生成值全为0的对象
	var result={};
	for(var s=0;s<vm.selected.size();s++){
		result[vm.selected[s].n]=val?eval(val):vm.selected[s].r;
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

function holeMap(h){//珠映射
	return function(val,index){
		return index==h?val+1:val;
	}
}

function shortMap(skill,short){//尚缺映射
	var r={};
	for(var s=0;s<vm.selected.size();s++){
		var name=vm.selected[s].n;
		r[name]=name in skill?Math.max(short[name]-skill[name],0):short[name];
	}
	return r;
}

function shortVal(short){
	var r=0;
	for(var s=0;s<vm.selected.size();s++){
		var name=vm.selected[s].n;
		r+=short[name]==0?0:1000+short[name]*vm.selected[s].v;
	}
	return r;
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
		vm.selected.push({n: skill.n, v: skill.v, r: 10, s:skill.s});
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
		vm.popup="loading";
		vm.closable=false;
		vm.info="计算中，请稍候…";
		setTimeout(function(){
			var r=vm.ranged?1:0;
			vm.stone=[];
			var hole=[[],[],[],[],[]];
			var short=[{},{},{},{},{}];//已拥有属性值
			var size=vm.selected.size();
			//选择备选技能珠
			var optionalGem=initSkill("[]");
			for(var s=0;s<size;s++){
				var name=vm.selected[s].n;
				for(var i in gem){
					if(name in gem[i].s && gem[i].s[name]>0){
						optionalGem[name].push(gem[i]);
					}
				}
			}
			//选择备选护甲
			var optionalArmor=[[],[],[],[],[]];
			for(var i=0;i<5;i++){
				var h3=true;
				for(var j in armor[r][i]){
					var h=armor[r][i][j].h;
					var val=0;
					for(var s=0;s<size;s++){
						var name=vm.selected[s].n;
						if(name in armor[r][i][j].s){
							val+=vm.selected[s].v*armor[r][i][j].s[name];
						}
					}
					if(val>0 || h3 && h==3){
						armor[r][i][j].val=val+estimate_hv[armor[r][i][j].h];
						optionalArmor[i].push(armor[r][i][j]);
						if(h==3) h3==false;
					}
				}
				optionalArmor[i].sort(function(a,b){
					return b.val-a.val;
				});
			}
			//第1层begin
			var tm_val=shortVal(initSkill());//最优解权重
			var tm_armor=[];//使用护甲记录
			var tm_mono={};//所有技能方案记录
			var tm_his={};//最优解全部记录
			var tm_last=[];//最优解最后一步记录
			var armorLength=[Math.min(optionalArmor[0].length,3),Math.min(optionalArmor[1].length,3),Math.min(optionalArmor[2].length,3),Math.min(optionalArmor[3].length,3),Math.min(optionalArmor[4].length,3)]
			for(var i0=0;i0<armorLength[0];i0++){
				short[0]=shortMap(optionalArmor[0][i0].s,initSkill());
				hole[0]=[0,0,0,0].map(holeMap(optionalArmor[0][i0].h));
				//第2层begin
				for(var i1=0;i1<armorLength[1];i1++){
					short[1]=shortMap(optionalArmor[1][i1].s,short[0]);
					hole[1]=hole[0].map(holeMap(optionalArmor[1][i1].h));
					//第3层begin
					for(var i2=0;i2<armorLength[2];i2++){
						short[2]=shortMap(optionalArmor[2][i2].s,short[1]);
						hole[2]=hole[1].map(holeMap(optionalArmor[2][i2].h));
						//第4层begin
						for(var i3=0;i3<armorLength[3];i3++){
							short[3]=shortMap(optionalArmor[3][i3].s,short[2]);
							hole[3]=hole[2].map(holeMap(optionalArmor[3][i3].h));
							//第5层begin
							for(var i4=0;i4<armorLength[4];i4++){
								short[4]=shortMap(optionalArmor[4][i4].s,short[3]);
								hole[4]=hole[3].map(holeMap(optionalArmor[4][i4].h));
								//todo
								var his=initSkill("[]");//最优解的历史记录
								var mono=initSkill("[]");//所有方案
								var fv=[[[]]];//最优解函数用来记录短缺值的
								var initShortVal=shortVal(short[4]);//基础短缺值
								for(var s=0;s<size;s++){
									var name=vm.selected[s].n;
									var ogl=optionalGem[name].length;
									if(ogl>0&&short[4][name]>0){
										var planMax=[0,0,0,0];
										var t_short=short[4][name];
										var holeValue=[0,0,0,0];
										var maxVal=1000+t_short*vm.selected[s].v;
										//计算上界
										for(var i=0;i<ogl;i++){
											//设置孔：技能数值映射
											var p=optionalGem[name][ogl-i-1].s[name];
											var h=optionalGem[name][ogl-i-1].h;
											holeValue[h]=p;
											//如尚未配完，最大填充
											if(t_short>0){
												planMax[h]=Math.min(Math.ceil(t_short/p),hole[4][h]);
												t_short-=planMax[h]*p;
											}
										}
										//从上界开始搜索所有方案
										for(var j3=planMax[3];j3>=0;j3--){
											t_short=short[4][name]-j3*holeValue[3];
											if(t_short>0){
												var max2=holeValue[2]>0?Math.min(Math.ceil(t_short/holeValue[2]),hole[4][2]+hole[4][3]-j3):0;
												for(var j2=max2;j2>=0;j2--){
													var _t_short=t_short-j2*holeValue[2];
													if(_t_short>0){
														var max1=holeValue[1]>0?Math.min(Math.ceil(_t_short/holeValue[1]),hole[4][1]+(hole[4][3]-j3)*3+(hole[4][2]-j2)*2):0;
														for(var j1=max1;j1>=0;j1--){
															var last=_t_short-j1*holeValue[1];
															if(last>0){
																mono[name].push({val: (short[4][name]-last)*vm.selected[s].v, h1: j1, h2: j2, h3: j3});
															}else{
																mono[name].push({val: maxVal, h1: j1, h2: j2, h3: j3});
															}
														}
													}else{
														mono[name].push({val: maxVal, h1: 0, h2: j2, h3: j3});
													}
												}
											}else{
												mono[name].push({val: maxVal, h1: 0, h2: 0, h3: j3});
											}
										}
									}
									for(var j3=hole[4][3];j3>=0;j3--){
										for(var j2=hole[4][2]+hole[4][3]-j3;j2>=0;j2--){
											for(var j1=hole[4][1]+(hole[4][3]-j3)*3+(hole[4][2]-j2)*2;j1>=0;j1--){
												var min_v=s==0?initShortVal:fv[j1][j2][j3];
												while(fv.length<=j1){
													fv.push([[]]);
												}
												while(fv[j1].length<=j2){
													fv[j1].push([]);
												}
												while(fv[j1][j2].length<=j3){
													fv[j1][j2].push(0);
												}
												for(var i=0;i<mono[name].length;i++){
													if(j3>=mono[name][i].h3 && j2>=mono[name][i].h2 && j1>=mono[name][i].h1){
														var origin=s==0?initShortVal:fv[j1-mono[name][i].h1][j2-mono[name][i].h2][j3-mono[name][i].h3];
														var tv=origin-mono[name][i].val;
														if(tv<min_v){
															min_v=tv;
															his[name].push({h1: j1, h2: j2, h3: j3, mono: i});
															if(tv<tm_val){
																tm_val=tv;
																tm_armor=[i0,i1,i2,i3,i4];
																tm_mono=mono;
																tm_last=[s,j1,j2,j3];
																tm_his=his;
															}
														}
													}
												}
												fv[j1][j2][j3]=min_v;
											}
										}
									}
								}
							}
							//第5层end
						}
						//第4层end
					}
					//第3层end
				}
				//第2层end
			}
			//第1层end
			//收集已有技能，在下列各步骤中
			var own=initSkill("0");
			//添加选中的护甲
			vm.armor=[];
			for(var i=0;i<5;i++){
				var a=optionalArmor[i][tm_armor[i]];
				for(var s in a.s){
					if(s in own) own[s]+=a.s[s];
					else if(s[0]!="$") own[s]=a.s[s];
				}
				vm.armor.push(a);
			}
			//添加选中的技能珠
			vm.gem=[];
			do{
				var name=vm.selected[tm_last[0]].n;
				var list=tm_his[name];
				var has=null;
				for(var i=0,h=list[0];i<list.length;h=list[++i]){
					if(h.h1==tm_last[1]&&h.h2==tm_last[2]&&h.h3==tm_last[3]){
						has=h;
					}
				}
				if(has){
					var c=tm_mono[name][has.mono];
					tm_last=[tm_last[0]-1,tm_last[1]-c.h1,tm_last[2]-c.h2,tm_last[3]-c.h3];
					for(var i=0;i<optionalGem[name].length;i++){
						var g=optionalGem[name][i];
						g.use=c["h"+g.h];
						for(var s in g.s){
							if(s in own) own[s]+=g.s[s]*g.use;
							else if(s[0]!="$") own[s]=g.s[s]*g.use;
						}
						if(g.use>0) vm.gem.push(g);
					}
				}else{
					tm_last=[tm_last[0]-1,tm_last[1],tm_last[2],tm_last[2]];
				}
			}while(tm_last[0]>=0&&(tm_last[1]!=0||tm_last[2]!=0||tm_last[3]!=0));
			//添加已有技能
			vm.own=[];
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
			//选护石
			for(var s=0;s<vm.selected.size();s++){
				var name=vm.selected[s].n;
				if(vm.selected[s].s && vm.selected[s].r>own[name]){
					vm.stone.push(vm.selected[s].s);
				}
			}
			vm.popup="";
		},100);
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
		if(new Date(last).getTime()>1456200635506){
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
			vm.popup="before_loading";
			vm.closable=false;
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
						skillEffect[idata[3]]=95;
					}else if(2E6<=iid && iid<3e6){//所有护石
						stone[idata[2]]=idata.slice(2);
						skillEffect[idata[2]]=idata[7]!=0?parseInt(100/idata[7],10):parseInt(100/idata[6],10);
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
