var AC_BITS = 10;
var AC_MAX = (1<<AC_BITS)-1;
var AC_P = .9;
var AC_MSB_MASK = 1<<(AC_BITS-1);
var AC_MAX_RANGE = 1<<AC_BITS;

function encode(input) {
    var output = "";

    var low = 0;
    var high = AC_MAX;
    while (input.length > 0) {
        // read bit
        console.log("read bit");
        var bit = +input[0];
        input = input.substr(1);

        var range = high-low;
        if (bit) {
            high = (low+range*AC_P)|0;
        } else {
            low  = (high-range*(1-AC_P))|0+1;
        }

        if ((low & AC_MSB_MASK)==(high & AC_MSB_MASK)) {
            var msb = +((low & AC_MSB_MASK) != 0);

            console.log("adjust",low,high);

            output+= +(!msb);

            low=(low<<1)&AC_MAX;
            high=(high<<1)&AC_MAX;
            console.log("new",low,high);
        }
        //console.log("@",low,high,low & AC_MSB_MASK,high & AC_MSB_MASK);
    }
    console.log("final",low,high);
    var leftover = (((high+low)/2)|0).toString(2);
    while (leftover.length<AC_BITS)
        leftover = "0"+leftover;
    output+=leftover;
    return output;
}

var source = "0111011101110";
var encoded = encode(source);
console.log("ENC",encoded);

function decode(enc_stream,len) {
    var range = 1;
    var value = 0;
    var plain_stream = "";

    function decode_bit() {
        while (range < AC_MAX_RANGE) {
            range <<= 1;
            value <<= 1;
            value |= enc_stream[0];
            enc_stream = enc_stream.substr(1);
            console.log("~",range.toString(2),value.toString(2),enc_stream);
        }

        var subrange = (range*AC_P)|0;
        range = range - subrange;
        console.log(value,range);
        if (value >= range) {
            value = value-range;
            range = subrange;
            return 1;
        } else {
            return 0;
        }
    }

    for (var i=0;i<len;i++) {
        plain_stream += decode_bit();
    }

    return plain_stream;
}

console.log("DEC",decode(encoded,source.length));

/*function encode(input) {
    var output = "";

    var low = 0;
    var mid = EC_PRECISION_Q2;
    var high = EC_PRECISION_MAX;

    while (input.length > 0) {
        // read bit
        var bit = +input[0];
        input = input.substr(1);

        // update mid
        {
            var range = high - low;
            var mid_range = range * EC_P / EC_PRECISION_MAX | 0;

            mid = low + mid_range;
        }
        console.log(low,mid,high);

        // encode bit
        if (bit) {
            low = mid+1;
        } else {
            high = mid;
        }

        // =>
        while (true) {
            if (high & EC_PRECISION_MAX == low & EC_PRECISION_MAX) {
                console.log("ERROR 1");
                var msb = (high & EC_PRECISION_MAX) >> (EC_PRECISION - 1);
                low -= EC_PRECISION_Q2 * msb + msb;
                high -= EC_PRECISION_Q2 * msb + msb;

                output += 1;
            } else if (high <= EC_PRECISION_Q3 && low > EC_PRECISION_Q1) {
                console.log("ERROR 2");
                process.exit(1);
            } else {
                break;
            }

            high = ((high << 1) & EC_PRECISION_MAX) | 1;
            low = ((high << 1) & EC_PRECISION_MAX) | 0;
        }

        console.log(">",bit,input);
    }

}

encode("11111111110000000000001111111111111111011111111111111111111111111111111111111111");*/