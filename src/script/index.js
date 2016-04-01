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
//var estimate_hv=[0,14,32,61];
var resultMessage=["无需护石即可配出","至少需要单属性护石可配出","至少需要双属性护石可配出"];

function initSkill(val){//根据技能列表生成值全为0的对象
	var result={};
	for(var s=0;s<vm.selected.size();s++){
		result[vm.selected[s].n]=val?eval(val):vm.selected[s].r;
	}
	return result;
}

function enable(i){//技能选择的过滤，2个条件，过滤字符串和已选择
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

function shortMap(skill,short){//尚缺技能映射
	var r={};
	for(var s=0;s<vm.selected.size();s++){
		var name=vm.selected[s].n;
		r[name]=name in skill?short[name]-skill[name]:short[name];
	}
	return r;
}

function hasMap(skill,q){//已有技能映射
	var r={};
	for(var i=0;i<skill.length;i++){
		for(var s in skill[i]){
			if(s in r) r[s]+=skill[i][s]*q[i];
			else if(s[0]!="$") r[s]=skill[i][s]*q[i];
		}
	}
	return r;
}

function shortVal(short){
	var r=0;
	for(var s=0;s<vm.selected.size();s++){
		var name=vm.selected[s].n;
		var stoneMax=vm.selected[s].s?Math.max(vm.selected[s].s[4],vm.selected[s].s[5]):0;
		r+=short[name]<=0?0:1000+short[name]*vm.selected[s].v+(short[name]>stoneMax?10000:0);
	}
	return r;
}

function holes(p,c,i,a){
	return p*(!!(i-1))+c*i;
}

var vm = avalon.define({
	$id: "mho",
	view: "param",//当前页
	last: 0,//当前数据更新时间
	popup: "",//弹出层id，没有就不弹出
	closable: true,//允许弹出层点击关闭
	skill: [],//可选择的技能，接受字符串和已选择双重过滤
	selected: [],//已选择的技能
	armor: [],//已选择的护甲
	gem: [],//已选择的珠子
	stone: [],//可选择的护石
	own: [],//已拥有技能
	info: '',//loading时的内容
	condition: '',//技能选择的过滤条件
	hasStone: false,//是否已有护石
	result: '',//配装结果
	armorText: [],//护甲的文本
	optionalArmor: [],//可选择的护甲
	selectedArmor: [null,null,null,null,null],//已选择的护甲
	pos: -1,//当前选择的护甲部位
	$computed: {
		ranged: {//从localStorage读取是否远程
			set: function(val){
				this.selectedArmor=[null,null,null,null,null];
				localStorage.setItem("ranged",val);
			},
			get: function(){
				var flag=localStorage.getItem("ranged")?eval(localStorage.getItem("ranged")):false;
				this.armorText=flag?['战帽','护甲','护手','护腰','护腿']:['头盔','铠甲','腕甲','腰甲','腿甲']
				return flag;
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
	addSkill: function(skill){//添加选择的技能
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
	listArmor: function(i){//列出待选择的技能
		vm.optionalArmor=armor[vm.ranged?1:0][vm.pos=i];
		vm.closable=true;
		vm.popup="armor_choose";
	},
	addArmor: function(j){//添加选择的护甲
		vm.selectedArmor[vm.pos]=armor[vm.ranged?1:0][vm.pos][j];
		vm.popup="";
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
	secondary: false,//已拥有技能折叠
	showSecondary: function(){
		vm.secondary=!vm.secondary;
	},
	calc: function(){//配装
		vm.popup="loading";
		vm.closable=false;
		vm.info="计算中，请稍候…";
		setTimeout(function(){
			var r=vm.ranged?1:0;
			//重置结果
			vm.stone=[];
			var hole=[[],[],[],[],[]];//5件装备阶段孔数
			var short=[{},{},{},{},{}];//5件装备阶段尚缺技能值
			var size=vm.selected.size();//总需求技能数
			var mono=new Array(size);//所有方案
			//选择备选技能珠，以及技能珠组合方案
			var optionalGem=initSkill("[]");
			var estimate_hv=[0,0,0,0];
			var hasAmount=[0,0,0,0];
			for(var s=0;s<size;s++){
				var name=vm.selected[s].n;
				var planMax=[0,0,0,0];
				var holeValue=new Array(4);
				for(var i in gem){
					if(name in gem[i].s && gem[i].s[name]>0){
						optionalGem[name].push(gem[i]);
						holeValue[gem[i].h]=gem[i].s;
					}
				}
				//从上界开始搜索所有方案
				var temp_size=0;
				mono[s]=new Array(temp_size=holeValue[3]?6:1);
				for(var j3=temp_size-1?5:0;j3>=0;j3--){
					mono[s][j3]=new Array(temp_size=holeValue[2]?6-j3:1);
					for(var j2=temp_size-1;j2>=0;j2--){
						mono[s][j3][j2]=new Array(temp_size=holeValue[1]?16-j3*3-j2*2:1);
						for(var j1=temp_size-1;j1>=0;j1--){
							mono[s][j3][j2][j1]=hasMap(holeValue,[0,j1,j2,j3]);
						}
					}
				}
				if(mono[s][0][0][1]){
					estimate_hv[1]+=mono[s][0][0][1][name]*vm.selected[s].v;
					hasAmount[1]++;
				}
				if(mono[s][0][1]){
					estimate_hv[2]+=mono[s][0][1][0][name]*vm.selected[s].v;
					hasAmount[2]++;
				}
				if(mono[s][1]){
					estimate_hv[3]+=mono[s][1][0][0][name]*vm.selected[s].v;
					hasAmount[3]++;
				}
			}
			if(hasAmount[1]!=0) estimate_hv[1]=estimate_hv[1]/hasAmount[1];
			estimate_hv[2]=hasAmount[2]==0?2*estimate_hv[1]:estimate_hv[2]/hasAmount[2];
			estimate_hv[3]=hasAmount[3]==0?estimate_hv[2]+estimate_hv[1]:estimate_hv[3]/hasAmount[3];
			//选择备选护甲
			var optionalArmor=[[],[],[],[],[]];
			for(var i=0;i<5;i++){
				if(vm.selectedArmor[i]){
					optionalArmor[i].push(vm.selectedArmor[i]);
				}else{
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
							h3=h3&&h!=3;
						}
					}
					optionalArmor[i].sort(function(a,b){
						return b.val-a.val;
					});
				}
			}
			//第1层begin
			var tm_val=shortVal(initSkill());//最优解权重
			var tm_holes=15;//最优解总孔数
			var tm_armor=[];//使用护甲记录
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
								var initShortVal=shortVal(short[4]);//基础短缺值
								var temp_size=0;
								var fv=new Array(temp_size=hole[4][3]+1);//最优解函数用来记录短缺值的
								var fs=new Array(temp_size);//最优解函数用来记录短缺技能的
								for(var s=0;s<size;s++){
									var name=vm.selected[s].n;
									var ogl=optionalGem[name].length;
									for(var j3=hole[4][3];j3>=0;j3--){
										temp_size=hole[4][2]+hole[4][3]-j3+1;
										if(!fv[j3]){
											fv[j3]=new Array(temp_size);
											fs[j3]=new Array(temp_size);
										}
										for(var j2=temp_size-1;j2>=0;j2--){
											temp_size=hole[4][1]+(hole[4][3]-j3)*3+(hole[4][2]-j2)*2+1;
											if(!fv[j3][j2]){
												fv[j3][j2]=new Array(temp_size);
												fs[j3][j2]=new Array(temp_size);
											}
											for(var j1=temp_size-1;j1>=0;j1--){
												var min_v=s==0?initShortVal:fv[j3][j2][j1];
												var min_s=s==0?short[4]:fs[j3][j2][j1];
												for(var m3=j3;m3>=0;m3--){
													for(var m2=j2;m2>=0;m2--){
														for(var m1=j1;m1>=0;m1--){
															if(mono[s][m3]&&mono[s][m3][m2]&&mono[s][m3][m2][m1]){
																var ts=shortMap(mono[s][m3][m2][m1],s==0?short[4]:fs[j3-m3][j2-m2][j1-m1]);
																var tv=shortVal(ts);
																var th=15;
																if(tv<min_v){
																	min_v=tv;
																	min_s=ts;
																	his[name].push({hole: [0,j1,j2,j3], use: [0,m1,m2,m3]});
																	if(tv<tm_val||tv==tm_val&&(th=hole[4].reduce(holes))<tm_holes){
																		tm_holes=th;
																		tm_val=tv;
																		tm_armor=[i0,i1,i2,i3,i4];
																		tm_last=[s,j1,j2,j3];
																		tm_his=his;
																	}
																}
															}
														}
													}
												}
												fv[j3][j2][j1]=min_v;
												fs[j3][j2][j1]=min_s;
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
			var param=new Array(5);
			param[0]="ranged="+r;
			param[1]="skill="+vm.selected.map(function(o,i,a){
				return o.n;
			}).join("~");
			//收集已有技能，在下列各步骤中
			var own=initSkill("0");
			//添加选中的护甲
			param[2]="armor="+optionalArmor.map(function(o,i,a){
				var ar=o[tm_armor[i]];
				for(var s in ar.s){
					if(s in own) own[s]+=ar.s[s];
					else if(s[0]!="$") own[s]=ar.s[s];
				}
				return armor[r][i].indexOf(ar);
			}).join("~");
			//添加选中的技能珠
			var selectedGem=[];
			do{
				var name=vm.selected[tm_last[0]].n;
				var list=tm_his[name];
				var has=null;
				for(var i=0,h=list[0];i<list.length;h=list[++i]){
					if(h.hole[1]==tm_last[1]&&h.hole[2]==tm_last[2]&&h.hole[3]==tm_last[3]){
						has=h;
					}
				}
				if(has){
					var u=has.use;
					tm_last=[tm_last[0]-1,tm_last[1]-u[1],tm_last[2]-u[2],tm_last[3]-u[3]];
					for(var i=0;i<optionalGem[name].length;i++){
						var g=optionalGem[name][i];
						if(u[g.h]>0){
							for(var s in g.s){
								if(s in own) own[s]+=g.s[s]*u[g.h];
								else if(s[0]!="$") own[s]=g.s[s]*u[g.h];
							}
							selectedGem.push(gem.indexOf(g)+"*"+u[g.h]);
						}
					}
				}else{
					tm_last=[tm_last[0]-1,tm_last[1],tm_last[2],tm_last[3]];
				}
			}while(tm_last[0]>=0&&(tm_last[1]!=0||tm_last[2]!=0||tm_last[3]!=0));
			param[3]="gem="+selectedGem.join("~");
			//添加已有技能
			param[4]="own="+Object.keys(own).map(function(o,i,a){
				return o+"*"+own[o];
			}).join("~");
			//选护石和完成结论
			var result=0;
			for(var s=0;s<size;s++){
				var name=vm.selected[s].n;
				if(vm.selected[s].r>own[name]){
					result++;
					if(vm.selected[s].s) vm.stone.push(vm.selected[s].s);
				}
			}
			if(result>(vm.hasStone?0:Math.min(2,vm.stone.size()))) vm.result="无法配出";
			else vm.result=vm.hasStone?"使用已有护石可以配出":resultMessage[vm.stone.size()];
			location.hash="#!/result?"+param.join("&");
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

require(["domReady!", "mmRequest", "mmRouter"], function() {
	vm.last=localStorage.getItem("update");
	if(vm.last){
		vm.last=new Date(vm.last);
		if(vm.last.getTime()>1459500579761){
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
		var armorOrder=[4,0,2,1,3];
		vm.popup="loading";
		vm.closable=false;
		vm.info="数据读取中…";
		avalon.getScript('http://c.gamer.qq.com/mho/rsync_cdn_filename_all.js')
		.done(function(){
			armor=[[[],[],[],[],[]],[[],[],[],[],[]]];
			skill=[];
			gem=[];
			vm.selected=[];
			for(var i in equipcb){
				var obj=equipcb[i];
				var iid=obj.iID;
				var idata=obj.data;
				if(6E4<=iid && iid<7e4 && idata[12]>=40){//所有护甲
					var a=idata[3];
					var b=armorOrder[iid%5];
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
			Object.keys(skillEffect).forEach(function(val){
				skill.push({n: val, v: skillEffect[val], s: stone[val]});
			});
			localStorage.setItem("armor",JSON.stringify(armor));
			localStorage.setItem("skill",JSON.stringify(skill));
			localStorage.setItem("gem",JSON.stringify(gem));
			vm.last=new Date();
			localStorage.setItem("update",vm.last);
			vm.popup="";
		})
		.fail(function(){vm.info="数据读取失败…请稍后再试";});
	};

	avalon.router.get("/param", function(){vm.view="param"});
	avalon.router.get("/result", function(){
		vm.view="result";
		//重置结果
		if(vm.result=="") vm.stone=[];
		vm.armor=[];
		vm.gem=[];
		vm.own=[];
		var r=this.query.ranged;
		var selectedSkill=this.query.skill.split("~");
		this.query.armor.split("~").forEach(function(val,i){
			vm.armor.push(armor[r][i][val]);
		});
		this.query.gem.split("~").forEach(function(val,i){
			var p=val.split("*");
			var g=gem[p[0]];
			g.use=p[1];
			vm.gem.push(g);
		});
		this.query.own.split("~").forEach(function(val,i){
			var p=val.split("*");
			vm.own.push({n: p[0], v: p[1]});
		});
		vm.own.sort(function(a,b){
			var m=100,n=100;
			selectedSkill.forEach(function(val,i){
				if(a.n==val) m=i;
				if(b.n==val) n=i;
			});
			return m-n;
		});
	});
	avalon.history.start({});
});
