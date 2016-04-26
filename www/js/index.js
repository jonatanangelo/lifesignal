var production = false;
var pathapi;
var login;
var usuario;
var seccion = "home";
var facebook;
var ubicacion;
var grupos;
var header;
var internagrupo;
var contactos;
var invitaciones;
var registro;

var socket;


var w; //ancho de pantalla
var h; //alto de pantalla

var terremoto = false;

if(production){
    //pathapi = "http://picnic.pe/clientes/bancofalabella/RESTAPI/";
    //pathapi = 'http://192.168.0.10/lifesignal/Life-Signal-Api/';
    pathapi = "http://picnic.pe/clientes/lifesignal/api/";
}else{
    //pathapi = 'http://52.34.151.159/RESTAPI/';
    pathapi = "http://localhost/lifesignal/api/";
   //pathapi = 'http://localhost/lifesignal/Life-Signal-Api/';
}

var home;
var usuario;
var initTime=1000;



var app = {
    
    initialize: function() {
        
        this.bindEvents();
    },

    bindEvents: function() {
        if(production){
            document.addEventListener('deviceready', this.onDeviceReady, false);
            document.addEventListener("resume", this.onDeviceResume);
            document.addEventListener("pause",this.onDevicePause);
        }else{
            $(document).ready(this.onDeviceReady);
        }
    },
    
    onDeviceResume: function(){
        //alert(1);
        backgroundGeoLocation.stop()

    },
    onDevicePause:function(){


        var callbackFn = function(location) {
            console.log('[js] BackgroundGeoLocation callback:  ' + location.latitude + ',' + location.longitude);

            socket.emit('enviarposicion',{
                id:usuario.id,
                lat:location.latitude,
                lon:location.longitude,
                from:'background'
            });
            backgroundGeoLocation.finish();


        };

        var failureFn = function(error) {
            console.log('BackgroundGeoLocation error');
        };

        // BackgroundGeoLocation is highly configurable. See platform specific configuration options
        backgroundGeoLocation.configure(callbackFn, failureFn, {
            desiredAccuracy: 10,
            stationaryRadius: 20,
            distanceFilter: 30,
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
            stopOnTerminate: false, // <-- enable this to clear background location settings when the app terminates
        });

        // Turn ON the background-geolocation system.  The user will be tracked whenever they suspend the app.
        backgroundGeoLocation.start();

    },

    onDeviceReady: function() {
        
        console.log("device ready");

        header = new Header();

        if(!production){
            setTimeout(function(){
                facebookConnectPlugin.browserInit('100412800363577');
            },2000);
            initTime = 1000;
        }

        setTimeout(function(){
            facebook =  new Facebook();
            console.log("local storage: "+window.localStorage.getItem("id"));
            if(window.localStorage.getItem("id")==null){
                console.log("no sesion");
                $("#home").show();
            }else{
                console.log("sesion activa");
                request("usuario/validar",{
                    id:window.localStorage.getItem("id")
                },function(res){
                    console.log("validar");
                    console.log(res);
                    if(res.existe == true){
                        usuario = new Usuario();
                        usuario.id = res.info.id;
                        usuario.nombres = res.info.nombres;
                        usuario.apellidos = res.info.apellidos;
                        usuario.email = res.info.email;
                        usuario.fbid = res.info.fbid;
                        usuario.pic = res.info.pic;





                        if(res.solofacebook == true){
                            facebook.getStatus(function(conectado){
                                console.log("statusfacebook");
                                console.log(conectado);
                                if(conectado){
                                    facebook.myInfo(function(info){
                                        console.log("infofacebook");
                                        
                                        usuario.iniciarSesion();

                                        //console.log("GRUPOS");
                                    })
                                }else{
                                    window.localStorage.removeItem("id");
                                    $("#home").show();
                                }

                            });
                        }else{
                            console.log("tiene usuario y clave");

                            usuario.iniciarSesion();
                            //console.log("GRUPOS");
                        }
                    }else{

                        window.localStorage.removeItem("id");
                        $("#home").show();
                    }
                },"get");
                
            }

        },initTime);
        
        w = $(window).innerWidth();
        h = $(window).innerHeight();
        //login = new Login();
        home = new Home();
        registro = new Registro();
        

        
    },
};




var Boton = function(dom,callback){
    var flagtouch=false;
    if(production){
        dom.on({
            "touchstart":function(){
                flagtouch=true;
                $(this).addClass("over");
            },
            "touchmove":function(){

                flagtouch=false;
            },
            "touchend":function(){
                if(flagtouch){
                    $(this).removeClass("over");

                    callback($(this));
                }
                

            }
        });
       

    }else{
        dom.bind({
            "mousedown":function(){
                $(this).addClass("over");
            },
            "mouseup":function(){
                $(this).removeClass("over");
                callback($(this));
            }
        });
    }

};

var Espera = function(){
    this.mensaje = function(str){
        $("#espera .msg").html(str);
    }
    this.show = function(){
        $("#espera").show();
    }
    this.hide = function(){
        $("#espera").hide();
        $("#espera .msg").html("");
    }
}


var Usuario = function(){

    this.iniciarSesion = function(tipo){
        console.log("iniciar sesion:"+this.id);
        window.localStorage.setItem("id",this.id);
        
        
        

       


        socket = io.connect('http://picnic.pe:8881');

        socket.on("connect", function() {
            //alert("conectado");
            console.log("usuario conectado al servidor");
            
            

            var opciones = {
                maximumAge: 15000,
                enableHighAccuracy:true,

            };
            navigator.geolocation.watchPosition(function(position){
                
                socket.emit('enviarposicion',{
                    id:usuario.id,
                    lat:position.coords.latitude,
                    lon:position.coords.longitude,
                    from:'foreground'
                });

            },function(e){
                console.log('error watchposition: '+e);
            },opciones);


            
        });

        socket.on("posicion",function(data){
            console.log(data);
            ubicacion.moverPosicion(data);
        });
        socket.on("mensaje",function(data){
            console.log(data);
        });

        
        socket.on("estadoterremoto",function(valor){
            terremoto=valor;
            if(valor){
                alert("¡TERREMOTO!");
                $("#internagrupo .btn.ubicacion").show();
            }
        });

        socket.on("hayterremoto",function(){
            terremoto=true;
            alert("¡TERREMOTO!");
            $("#internagrupo .btn.ubicacion").show();
        });



        socket.on("acaboterremoto",function(){
            terremoto=false;
            console.log("acabo");
            $("#internagrupo .btn.ubicacion").hide();

            if(seccion=="ubicacion"){
                getContent({page:"grupos"},false);
            }
        });

        socket.on("enviarinvitacion",function(invitado){
            if(usuario.id == invitado){
                header.cargarInvitaciones();
            }
        });

        socket.on('aceptarinvitacion',function(data){
            if(data.usuario==usuario.id){
                grupos.listar();    
            }
            if(seccion=="internagrupo" && internagrupo.id == data.grupo){
                internagrupo.listarcontactos(data.grupo);
            }
        });



        if(tipo=="nuevo"){
            socket.emit("mensaje",{
                accion:"nuevousuario"
            })
        }
        grupos = new Grupos();
        internagrupo = new Internagrupo();
        ubicacion = new Ubicacion();
        contactos = new Contactos();
        invitaciones = new Invitaciones();

        socket.on("mensaje",function(data){
            if(data.accion=="nuevousuario"){
                contactos.flag=false;
            }
        });

        $("#home").hide();
        $("#header").show();

        grupos.cargarMiPerfil();
        grupos.listar();

        header.cargarInvitaciones();

        getContent({page:"grupos"},true);

    }
    this.cerrarSesion = function(){
        window.localStorage.removeItem("id");
        location.reload();
    }
    
}


function request(ac,params,callback){
    $.ajax({
        url:pathapi+ac,
        dataType:"json",
        data:params,
        type:'get',
        success:callback
    });
}


window.onpopstate = function(event) {

   
    getContent(event.state,false);
   

    

};


function getContent(obj,addEntry){
    
    if(obj==null){
        obj = new Object({page:"home"});
    }

    var antseccion = seccion;
    seccion=obj.page;

   
    if(antseccion!="") window[antseccion].ocultar();
       
    switch(seccion){
        case "home":
            $("#header").hide();
            home.mostrar();
            break;
        case "internagrupo":
            internagrupo.mostrar();
            internagrupo.listarcontactos(obj.grupo);
            break;
        case "ubicacion":
            if(terremoto==false){
                history.back();
            }
            ubicacion.mostrar();
            ubicacion.iniciarMapa();
            break;
        case "contactos":
            contactos.listar();
            contactos.mostrar();
            break;
        case "invitaciones":
            invitaciones.listar();
            invitaciones.mostrar();
            break;
        default:
            window[seccion].mostrar();

       
    }

    if(seccion=="grupos"){
        $("#header .back").hide();
    }else{
        $("#header .back").show();
    }

    //if(menu.abierto) menu.cerrar();

    


   
   
    

    

    //window[antseccion].ocultar();
    //window[seccion].mostrar();

    if(addEntry == true) {
        history.pushState(obj,null); 
    }

    //window.scrollTo(0,0);

    
    


}

var Seccion = function(){

    this.mostrar = function(){
        this.dom.css('display',"block");
        this.dom.transition({opacity:0},0);
        this.dom.transition({opacity:1});

        //header.setTitulo(this.titulo);

        //this.dom.show();
    }

    this.ocultar = function(){
        this.dom.hide();
    }
}

/*var Alerta = function(msg,callback,title,button){
    if(production){
        navigator.notification.alert(msg, callback, title, button);
    }else{
        alert(msg);
        callback();
    }
}

var Data = function(){

    this.categorias = new Array();
    this.descuentos = new Array();
    this.beneficios = new Array();
    this.locales = new Array();
    this.tipos = new Array();
    this.canales =  new Array();

}

var data = new Data();


window.onpopstate = function(event) {

   
    getContent(event.state,false);
   

    

};


function getContent(obj,addEntry){
    
   
    var antseccion = seccion;
    seccion=obj.page;

   
    if(antseccion!="") window[antseccion].ocultar();
       
    switch(seccion){
        case "descuentos":

            descuentos.mostrar(obj.cat,obj.neg);
            break;
        case "beneficios":
            beneficios.mostrar();
            break;
        case "encuentranos":
            encuentranos.mostrar();
            break;
        case "detalle":
            detalle.mostrar(obj.id);
            break;
        case "gmaps":
            gmaps.mostrar(obj.cat,obj.neg);
            break;
        case "ubicacion":
            ubicacion.mostrar(obj.negocio);
            break;
        case "canales":
            canales.mostrar();
            break;
    }

    if(menu.abierto) menu.cerrar();

    


   
   
    

    

    //window[antseccion].ocultar();
    //window[seccion].mostrar();

    if(addEntry == true) {
        history.pushState(obj,null); 
    }

    //window.scrollTo(0,0);

    
    


}


*/

var Alerta = function(msg,btn){

    $("#alerta .txt").html(msg);

    if(btn!=undefined){
        $("#alerta .bt").html(btn);
    }

    $("#alerta").css('display',"block");
    $("#alerta").transition({opacity:0},0);
    $("#alerta").transition({opacity:1});

    new Boton($("#alerta .cerrar"),function(){
        $("#alerta").hide();
    })
    new Boton($("#alerta .bt.ok"),function(){
        $("#alerta").hide();
    })
}