if [ $# -gt 0 ]
  then
    ./critical "$@"
fi
cd src
node jobs.js &
echo 'starting web server ...'
node ./bin/www