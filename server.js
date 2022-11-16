const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const { engine } = require('express-handlebars');
const PORT = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(__dirname + '/public'));

const Contenedor = require('./classContainer/contenedor');
const container = new Contenedor('./data/products.json');
const chatMsgs = new Contenedor('./data/msgs.json');

//handlebars settings
app.set('view engine', 'hbs');
app.set('views', './views');
app.engine(
  'hbs',
  engine({
    extname: '.hbs',
    defaultLayout: 'index.hbs',
    layoutsDir: __dirname + '/views/layouts',
    partialsDir: __dirname + '/views/partials',
  })
);

//FRONT END
app.get('/', async (req, res) => {
  const products = await container.getAll();
  if (products) {
    res.render('main', { products });
  }
});

//BACK END

//WEBSOCKET PARA TABLA DE PRODUCTOS
//1) conexion server
io.on('connection', async (socket) => {
  console.log('usuario conectado');
  socket.emit('msgs', await chatMsgs.getAll());
  socket.emit('products', await container.getAll());

  //3) atrapamos el sendProd que hace el front cuando llena el form
  socket.on('newProd', async (data) => {
    await container.save(data);
    const updateList = await container.getAll();
    io.sockets.emit('products', updateList); //se la envio a todos los sockets
  });

  socket.on('newMsg', (data) => {
    chatMsgs.save(data);
    const msgsList = chatMsgs.getAll();
    io.sockets.emit('msgs', msgsList);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Servidor http escuchando en el puerto http://localhost:${PORT}`);
});
