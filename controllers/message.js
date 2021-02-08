import express from "express";


export const getMessage=async(req, res)=>{
  nylas.threads.list({unread: true}).then(threads =>{
    for (let thread of threads) {
        console.log(thread);
    }
});
}
