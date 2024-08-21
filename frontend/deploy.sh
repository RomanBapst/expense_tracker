#/bin/bash

remote_ip=$1

npm run build
scp -r dist root@${remote_ip}:/var/www