const ws = require("ws");
const server = new ws.WebSocketServer({port:8080}, ()=>{
    console.log("Servidor creado");
})

//datos juego
var jugadores = new Map(); // guardo: indice = conexion, dato = datos del jugador
var siguienteId = 0;

//fruta
var fruta = {
    //posicion random de la fruta
    posx: Math.floor(Math.random()*480), 
    posy: Math.floor(Math.random()*480),
}

function crearFruta(){
    //posicion random de la fruta
    fruta.posx = Math.floor(Math.random()*480);
    fruta.posy = Math.floor(Math.random()*480);

    //avisar a todos los jugadores de la posicion de la fruta
    jugadores.forEach ((dtos,conexion)=>{
        conexion.send(JSON.stringify({
            tipo: "NuevaFruta",
            datos:fruta
        }));
    })
}

function ColisionConFruta(conexionjugador){
    var jugador = jugadores.get(conexionjugador);
    if (!jugador)return;

    //calcular distancia entre el jugador y la fruta
    var distanciax = Math.abs(jugador.posx - fruta.posx);
    var distanciay = Math.abs(jugador.posy - fruta.posy);

    //comprobar si el jugador esta cerca de la fruta
    if(distanciax < 20 && distanciay < 20){
        console.log("Jugador a recogido la fruta");

        //sumar un punto al jugador
        jugador.puntos += 1;
        jugadores.set(conexionjugador,jugador);

        //avisa a todos los jugadores de la nueva conexion
        jugadores.forEach((dtos, conexion) => {
            conexion.send(JSON.stringify({
                tipo:"nuevaPuntuacion",
                datos: {id: jugador.id, puntos: jugador.puntos}
            }));
        });
        //crear una nueva fruta
        crearFruta();
    }
}



server.addListener("connection", (conexionjugador)=>{
    console.log ("Un jugador se a conectado");

    //crear un nuevo jugador
    var datos= {id: siguienteId, 
        posx: Math.floor(Math.random()*480), 
        posy: Math.floor(Math.random()*480),
        dir: "0",
        puntos: 0
        };
    siguienteId++; // para que la siguiente conexion tenga un Id distinto
    jugadores.set(conexionjugador, datos);

    jugadores.forEach((dtos, conexion) =>{
            conexion.send(
                JSON.stringify(
                    {
                        tipo:"new",
                        datos: datos
                    }
                )
            )
    });

    //avisar a todos los jugadores que hay uno nuevo
    jugadores.forEach((dtos, conexion) =>{
        if(conexion!=conexionjugador){
            conexionjugador.send(
                JSON.stringify(
                    {
                        tipo:"new",
                        datos: dtos
                    }
                )
            ); 
        }
    })

    //avisa a los nuevos jugadores de la posicion de la fruta
    conexionjugador.send(
        JSON.stringify({
            tipo: "NuevaFruta",
            datos:fruta
        })
    )

    conexionjugador.addEventListener("close", () =>{
        console.log("Un jugador se a desconectado");

        //buscar quien se a desconectado
        var datosDeQuienSeDesconecta = jugadores.get(conexionjugador);
        //eliminarlo de la lista
        jugadores.delete(conexionjugador);
        // avisar a los demas
        jugadores.forEach((dtos, conexion) =>{
            conexion.send(
                JSON.stringify(
                    {
                        tipo: "delete",
                        datos: datosDeQuienSeDesconecta.id
                    }
                )
            );
        });
    })

    conexionjugador.addEventListener("message", (mensaje)=>{
        mensaje = JSON.parse(mensaje.data.toString());
        
        if (mensaje.tipo == "mover") {
            //var tecla = mensaje.datos;
            var datosDeJugador = jugadores.get(conexionjugador);

                datosDeJugador.posx = mensaje.datos.posx;
                datosDeJugador.posy = mensaje.datos.posy;
                datosDeJugador.dir = mensaje.datos.dir;

            //guardar la información actualizada
            jugadores.set(conexionjugador, datosDeJugador);

            //informar a todos
            jugadores.forEach((dtos, conexion)=>{
                conexion.send(JSON.stringify(
                    {
                    tipo: "mover",
                    datos: datosDeJugador
                }));
            });

            //comprobar si el jugador a tocado la fruta
            ColisionConFruta(conexionjugador);
        }
    })
})

crearFruta();